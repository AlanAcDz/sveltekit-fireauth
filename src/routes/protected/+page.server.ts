import { signOut, onlyAuthenticatedLoad, verifyUserSession } from '$lib/server'

export const load = onlyAuthenticatedLoad({
	redirectRoute: '/login',
	load: (event) => ({
		session: verifyUserSession(event),
	}),
})

export const actions = {
	logout: async ({ cookies }) => {
		return signOut({ cookies, redirectRoute: '/login' })
	},
}
