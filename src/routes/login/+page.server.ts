import { error, fail, redirect } from '@sveltejs/kit'
import { loginWithCredentials, onlyPublicLoad, signupWithCredentials } from '$lib/server'

export const load = onlyPublicLoad({
	redirectRoute: '/protected',
})

export const actions = {
	login: async (event) => {
		const form = await event.request.formData()
		const email = form.get('email') as string | null
		const password = form.get('password') as string | null
		if (!(email && password)) {
			throw fail(400, { message: 'Missing email or password' })
		}
		try {
			await loginWithCredentials({ event, email, password })
		} catch (e) {
			throw error(401, { message: 'Unauthorized' })
		}
		throw redirect(303, '/protected')
	},
	signup: async (event) => {
		const form = await event.request.formData()
		const email = form.get('email') as string | null
		const password = form.get('password') as string | null
		if (!(email && password)) {
			throw fail(400, { message: 'Missing email or password' })
		}
		try {
			await signupWithCredentials({ event, email, password })
		} catch (e) {
			throw error(400, { message: 'Account not created' })
		}
		throw redirect(303, '/protected')
	},
}
