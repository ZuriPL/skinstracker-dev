import 'dotenv/config'
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb'
import puppeteer from 'puppeteer'
import { fileURLToPath } from 'url'

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
				await page.goto(`https://buff.163.com/goods/${id}#tab=selling`)

				let priceElement = await page.waitForSelector(
					'.list_tb_csgo > tr:nth-child(2) > td:nth-child(5) > div:nth-child(1) > p > span'
				)
				let price = await page.evaluate((priceElement) => priceElement.textContent, priceElement)

				// delete parentheses and move the CNY symbol from left to right
				price = price.split('')
				price.shift()
				price.pop()
				price = price.join('')
				price = price.split(' ').reverse().join(' ')

				let nameElement = await page.waitForSelector(
					'body > div.market-list > div > div.detail-header.black > div.detail-cont > div:nth-child(1) > h1'
				)
				let name = await page.evaluate((nameElement) => nameElement.textContent, nameElement)

				name = name.split('★')
				name = name.join('')
				let image = await page.evaluate(() =>
					document
						.querySelector('div.detail-header.black > div.detail-pic > div.t_Center > img')
						.getAttribute('src')
				)

				return { id, name, price, image }
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
			const browser = await puppeteer.launch({ headless: true })
			const page = await browser.newPage()
			page.setCookie({
				name: 'session',
				value: '1-HjHlBpm9bzYx7pPS6mXo-5s-yGMPuYuTakolIZe8U0Ms2037372961',
				domain: 'buff.163.com',
			})
			await page.goto('https://buff.163.com')
			page.deleteCookie({
				name: 'session',
				value: '1-HjHlBpm9bzYx7pPS6mXo-5s-yGMPuYuTakolIZe8U0Ms2037372961',
				domain: 'buff.163.com',
			})
			for (const id of ids) {
				result.push(await scrape(id))
			}
			browser.close()

			let obj = {}

			result.forEach((result) => {
				obj[result.id] = { name: result.name, price: result.price, image: result.image }
			})

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
