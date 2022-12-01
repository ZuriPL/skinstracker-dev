import 'dotenv/config'
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb'
import { fileURLToPath } from 'url'
import fetch from 'node-fetch'

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
				let res = await fetch(`https://buff.163.com/api/market/goods/sell_order?game=csgo&goods_id=${id}`)
				console.log(await res.text())
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

			let results = []

			for (const id of ids) {
				results.push(scrape(id))
			}

			await Promise.all(results).then((values) => (results = values))

			let obj = {}

			results.forEach((result) => {
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

export default first

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	first()
}
