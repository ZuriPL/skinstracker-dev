import 'dotenv/config'
import nodemailer from 'nodemailer'
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb'
import { fileURLToPath } from 'url'

async function mailer(reciever, skins) {
	let transporter = nodemailer.createTransport({
		service: 'gmail',
		auth: {
			user: 'skinstracker@gmail.com',
			pass: 'wrjslyvjirpaoyis',
		},
	})

	let content = ''
	let n = 0

	const makeRow = (skin, isEven) => {
		return `<tr ${isEven ? 'bgcolor="#ddd"' : ''}>
		<td style="padding:8px;padding-left:12px;">${skin.name}</td>
		<td style="padding:8px;width:20%;"><center>${skin.price}</center></td>
	</tr>`
	}

	skins.forEach((skin) => {
		content += makeRow(skin, n % 2 == 1)
		n++
	})

	let mailTemplate = `
	<style type="text/css">
	td {
		padding: 12px;
	}
	* {
		font-size: 24px;
	}
	</style>
	<h1 style="font-size:36px;color:black;"><strong><center>Daily Report - ${
		new Date().getDate().toString() +
		'.' +
		(new Date().getMonth() + 1).toString() +
		'.' +
		new Date().getFullYear().toString()
	}</center></strong></h1>
	<center><table style="width:95%;max-width:800px;">
		<tr bgcolor="#3366cc">
			<td style="padding:8px;font-size:16px;color:white;padding-left:12px;"><strong> Item </strong></th>
			<td style="padding:8px;font-size:16px;width:20%;color:white;"><strong><center> Price </center></strong></th>
		</tr>

		${content}
	</table></center>
	`

	let info = await transporter.sendMail({
		from: 'SkinsTracker',
		to: reciever,
		subject: 'Daily Report',
		html: mailTemplate,
	})
}

async function second() {
	const promise = new Promise((res, rej) => {
		const uri = process.env.URI
		const client = new MongoClient(uri, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
			serverApi: ServerApiVersion.v1,
		})
		client.connect(async (err) => {
			const collection = client.db('SkinsTracker').collection('SkinsTracker')
			let data = await collection.findOne({ _id: ObjectId('62923f1b36006ed1642ff7d5') })

			data.users.forEach((user) => {
				let allSkins = []
				user.skins.forEach((id) => allSkins.push(data.skins[id]))
				mailer(user.email, allSkins).catch(console.error)
			})

			client.close()
			res()
		})
	})
	return await promise
}

export default second

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	second()
}
