// import first from './scraper.js'
// import second from './mailer.js'
// const first = require('./scraper.js')
// const second = require('./mailer.js')
import express from 'express'
import 'dotenv/config'
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb'
import fetch from 'node-fetch'
import nodemailer from 'nodemailer'

const app = express()
const port = 3000

async function mailer(reciever, skins) {
	let transporter = nodemailer.createTransport({
		service: 'gmail',
		auth: {
			user: 'skinstracker@gmail.com',
			pass: process.env['MAILPASS'],
		},
	})

	let content = ''
	let n = 0

	const makeRow = (skin, isEven) => {
		return `
		<tr ${isEven ? 'bgcolor="#ddd"' : ''}>
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

	await transporter.sendMail({
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
				try {
					mailer(user.email, allSkins).catch(console.error)
				} catch (e) {
					pass
				}
			})

			client.close()
			res()
		})
	})
	return await promise
}

async function first() {
	const promise = new Promise((res, rej) => {
		const uri = process.env.URI

		const client = new MongoClient(uri, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
			serverApi: ServerApiVersion.v1,
		})

		client.connect(async (err) => {
			async function scrape(id) {
				let res = await fetch(`https://buff.163.com/api/market/goods/sell_order?game=csgo&goods_id=${id}`, {
					headers: {
						cookie: 'Locale-Supported=en',
					},
					credentials: 'include',
					mode: 'cors',
				})
				let data = await res.json()

				let name = data.data.goods_infos[id].name
				let price = data.data.items[0].price + ' ¥'

				return { name, price, id }
			}

			const collection = client.db('SkinsTracker').collection('SkinsTracker')
			let data = await collection.findOne({ _id: ObjectId('62923f1b36006ed1642ff7d5') })

			let ids = []
			data.users.forEach((user) => {
				user.skins.forEach((skin) => {
					ids.push(skin)
				})
			})

			ids = [...new Set(ids)]

			client.close()

			let result = []

			for (const id of ids) {
				result.push(await scrape(id))
			}

			let obj = {}

			result.forEach((result) => {
				obj[result.id] = { name: result.name, price: result.price }
			})

			console.log(obj)

			client.connect(async (err) => {
				const collection = client.db('SkinsTracker').collection('SkinsTracker')

				await collection.updateOne(
					{ _id: ObjectId('62923f1b36006ed1642ff7d5') },
					{
						$set: {
							skins: obj,
						},
					}
				)

				client.close()
				res()
			})
		})
	})
	return await promise
}

async function taskWrapper(func, taskName) {
	console.log(`[INFO] Started task ${taskName} at ${new Date()}`)
	let start = Date.now()
	await func()
	let time = Date.now() - start
	console.log(`[INFO] Task ${taskName} ended at ${new Date()} in ${time}ms`)
	return true
}

app.get('/', async (req, res) => {
	console.log(1)
	await taskWrapper(first, 'Scrape')
	await taskWrapper(second, 'Mail')
	res.send('Success!')
})

app.get('/healthz', (req, res) => {
	res.status(200).send('Ok')
})

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`)
})
