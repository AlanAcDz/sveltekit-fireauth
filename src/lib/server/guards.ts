import { redirect, type ServerLoadEvent, type RequestEvent, error } from '@sveltejs/kit'

type AuthReturn<Out> = Out extends undefined ? undefined : Out
interface LoadGuardOptions {
	redirectUrl?: string
}

export const onlyAuthenticatedLoad = <In extends ServerLoadEvent, Out>(
	{ redirectUrl = '/login' }: LoadGuardOptions,
	loadFn?: (event: In) => Out
) => {
	return async (event: In): Promise<AuthReturn<Out>> => {
		const session = await event.locals.verifySession()
		if (!session) {
			throw redirect(302, redirectUrl)
		}
		return (loadFn ? loadFn(event) : undefined) as AuthReturn<Out>
	}
}

export const onlyPublicLoad = <In extends ServerLoadEvent, Out>(
	{ redirectUrl = '/' }: LoadGuardOptions,
	loadFn?: (event: In) => Out
) => {
	return async (event: In): Promise<AuthReturn<Out>> => {
		const session = await event.locals.verifySession()
		if (session) {
			throw redirect(302, redirectUrl)
		}
		return (loadFn ? loadFn(event) : undefined) as AuthReturn<Out>
	}
}

export const onlyAuthenticatedRoute = <In extends RequestEvent, Out>(
	loadFn: (event: In) => Out
) => {
	return async (event: In): Promise<AuthReturn<Out>> => {
		const session = await event.locals.verifySession()
		if (!session) {
			throw error(401, { message: 'Unauthorized' })
		}
		return loadFn(event) as AuthReturn<Out>
	}
}

export const onlyPublicRoute = <In extends RequestEvent, Out>(loadFn: (event: In) => Out) => {
	return async (event: In): Promise<AuthReturn<Out>> => {
		const session = await event.locals.verifySession()
		if (session) {
			throw error(401, { message: 'Unauthorized' })
		}
		return loadFn(event) as AuthReturn<Out>
	}
}
