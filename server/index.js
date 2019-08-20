import { VK, Keyboard } from 'vk-io'
import config from 'config'
import axios from 'axios'

const vk = new VK ({
	token: config.get('token')
})

vk.updates.use(async (context, next) => {
	if(context.is('message') && !context.isOutbox && context.hasText) {
		await next()
	}
})
// Keyboard max size: 4x10
vk.updates.use(async (context, next) => {
	const {messagePayload} = context

	if (!messagePayload) {
		await context.send('Я тебя услышал', {
			keyboard: await getCurrencyKeyboard()
		})
		const user = await getUserFN(context.senderId) 
		await context.send({
			message: `${user} написал следующее:
			"${context.text}"
			- конец цитаты.`,
			user_id: config.get('adminId')
		})
	} 

	else {
		const currency = await getCurrency()
		const valute = currency.Valute[messagePayload.currency]
		const {Nominal, Name, Value} = valute

		await context.send(`${Nominal} ${Name} = ${Value} рублей.`)
	}

	await next()
})


vk.updates.startPolling()
	.then(() => console.log('Start server fired.'))
	.catch(err => console.error(err))


async function getCurrency () {
	const apiCurrency = 'https://www.cbr-xml-daily.ru/daily_json.js'
	const answer = await axios.get(apiCurrency)
	return answer.data
}


async function getCurrencyKeyboard () {
	const data = await getCurrency()
	const valutes = Object.keys(data.Valute)
	const grid = []

	while (valutes.length) {
		const row = valutes.splice(0, 4).map( item => {
			return Keyboard.textButton({
				label: item,
				color: Keyboard.PRIMARY_COLOR,
				payload: {
					currency: item
				}
			})
		})

		grid.push(row)
	}
	return Keyboard.keyboard(grid).oneTime()
}


async function getUserFN (iserID) {
	const params = {user_ids: iserID }
	const data = await vk.api.users.get(params)
	const  {first_name:name, last_name: family } = data

	return `${data[0].first_name} ${data[0].last_name}`
}

