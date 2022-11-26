import first from './scraper.js'
import second from './mailer.js'
import express from 'express'
import 'dotenv/config'

const app = express()
const port = process.env.PORT || 3000

async function taskWrapper(func, taskName) {
	console.log(`[INFO] Started task ${taskName} at ${new Date()}`)
	let start = Date.now()
	await func()
	let time = Date.now() - start
	console.log(`[INFO] Task ${taskName} ended at ${new Date()} in ${time}ms`)
	return true
}

app.get('/mail', async (req, res) => {
	await taskWrapper(first, 'Scrape')
	await taskWrapper(second, 'Mail')

	await fetch(`https://buff.163.com/api/message/notification`, {
		headers: {
			cookie: process.env['SESSION'],
		},
		credentials: 'include',
		mode: 'cors',
	})

	res.send('Success!')
})

app.get('/healthz', (req, res) => {
	res.status(200).send('Ok')
})

app.listen(port, () => {
	console.log(`App listening on port ${port}`)
})
