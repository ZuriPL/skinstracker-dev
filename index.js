import first from './scraper.js'
import second from './mailer.js'

async function taskWrapper(func, taskName) {
	console.log(`[INFO] Started task ${taskName} at ${new Date()}`)
	let start = Date.now()
	await func()
	let time = Date.now() - start
	console.log(`[INFO] Task ${taskName} ended at ${new Date()} in ${time}ms`)
	return true
}

await taskWrapper(first, 'Scrape')
await taskWrapper(second, 'Mail')
