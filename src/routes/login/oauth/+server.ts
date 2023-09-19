import { error, json } from '@sveltejs/kit'
import { loginWithIdToken } from '$lib/server'

export const POST = async (event) => {
	const { token } = await event.request.json()
	if (!token) {
		throw error(400, { message: 'Missing token' })
	}
	try {
		await loginWithIdToken({ event, token })
	} catch (e) {
		throw error(401, { message: 'Unauthorized' })
	}
	return json({ success: true })
}
