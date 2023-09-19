import { verifySession } from '$lib/server'

export const load = (event) => ({
	session: verifySession(event),
})
