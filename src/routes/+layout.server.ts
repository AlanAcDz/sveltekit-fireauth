import { verifySession } from '$lib/server'

export const load = (event) => ({
	authConfig: event.locals.auth.config,
	session: verifySession(event),
})
