import {
	error,
	redirect,
	type ServerLoadEvent,
	type RequestEvent,
	type Handle,
} from '@sveltejs/kit'

type AuthReturn<Out> = Out extends undefined ? undefined : Out

interface LoadGuardOptions {
	redirectRoute?: string
}

interface HandleGuardOptions extends LoadGuardOptions {
	baseRoute: string
}

const defaultLoginRoute = '/login'
const defaultProtectedRoute = '/'

export const onlyAuthenticatedLoad = <In extends ServerLoadEvent, Out>(
	{ redirectRoute = defaultLoginRoute }: LoadGuardOptions,
	loadFn?: (event: In) => Out
) => {
	return async (event: In): Promise<AuthReturn<Out>> => {
		const session = await event.locals.verifySession()
		if (!session) {
			throw redirect(303, redirectRoute)
		}
		return (loadFn ? loadFn(event) : undefined) as AuthReturn<Out>
	}
}

export const onlyPublicLoad = <In extends ServerLoadEvent, Out>(
	{ redirectRoute = defaultProtectedRoute }: LoadGuardOptions,
	loadFn?: (event: In) => Out
) => {
	return async (event: In): Promise<AuthReturn<Out>> => {
		const session = await event.locals.verifySession()
		if (session) {
			throw redirect(303, redirectRoute)
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

export const createProtectedRoutesHandle = ({
	baseRoute,
	redirectRoute = defaultLoginRoute,
}: HandleGuardOptions): Handle => {
	return async ({ event, resolve }) => {
		if (event.url.pathname.startsWith(baseRoute)) {
			const session = await event.locals.verifySession()
			if (!session) {
				throw redirect(303, redirectRoute)
			}
		}
		return resolve(event)
	}
}

export const createPublicRoutesHandle = ({
	baseRoute,
	redirectRoute = defaultProtectedRoute,
}: HandleGuardOptions): Handle => {
	return async ({ event, resolve }) => {
		if (event.url.pathname.startsWith(baseRoute)) {
			const session = await event.locals.verifySession()
			if (session) {
				throw redirect(303, redirectRoute)
			}
		}
		return resolve(event)
	}
}
