import {
	error,
	redirect,
	type ServerLoadEvent,
	type RequestEvent,
	type Handle,
	type RequestHandler,
} from '@sveltejs/kit'
import { verifySession } from './helpers'

type AuthReturn<Out> = Out extends undefined ? undefined : Out

interface LoadGuardOptions<In, Out> {
	redirectRoute: string
	load?: (event: In) => Out
}

interface HandleGuardOptions {
	redirectRoute: string
	baseRoute: string
}

export const onlyAuthenticatedLoad = <In extends ServerLoadEvent, Out>({
	redirectRoute,
	load,
}: LoadGuardOptions<In, Out>) => {
	return async (event: In): Promise<AuthReturn<Out>> => {
		const session = await verifySession(event)
		if (!session) {
			throw redirect(303, redirectRoute)
		}
		return (load ? load(event) : undefined) as AuthReturn<Out>
	}
}

export const onlyPublicLoad = <In extends ServerLoadEvent, Out>({
	redirectRoute,
	load,
}: LoadGuardOptions<In, Out>) => {
	return async (event: In): Promise<AuthReturn<Out>> => {
		const session = await verifySession(event)
		if (session) {
			throw redirect(303, redirectRoute)
		}
		return (load ? load(event) : undefined) as AuthReturn<Out>
	}
}

export const onlyAuthenticatedRoute = <In extends RequestEvent>(requestHandler: RequestHandler) => {
	return async (event: In) => {
		const session = await verifySession(event)
		if (!session) {
			throw error(401, { message: 'Unauthorized' })
		}
		return requestHandler(event)
	}
}

export const onlyPublicRoute = <In extends RequestEvent>(requestHandler: RequestHandler) => {
	return async (event: In) => {
		const session = await verifySession(event)
		if (session) {
			throw error(401, { message: 'Unauthorized' })
		}
		return requestHandler(event)
	}
}

export const createProtectedRoutesHandle = ({
	baseRoute,
	redirectRoute,
}: HandleGuardOptions): Handle => {
	return async ({ event, resolve }) => {
		if (event.url.pathname.startsWith(baseRoute)) {
			const session = await verifySession(event)
			if (!session) {
				throw redirect(303, redirectRoute)
			}
		}
		return resolve(event)
	}
}

export const createPublicRoutesHandle = ({
	baseRoute,
	redirectRoute,
}: HandleGuardOptions): Handle => {
	return async ({ event, resolve }) => {
		if (event.url.pathname.startsWith(baseRoute)) {
			const session = await verifySession(event)
			if (session) {
				throw redirect(303, redirectRoute)
			}
		}
		return resolve(event)
	}
}
