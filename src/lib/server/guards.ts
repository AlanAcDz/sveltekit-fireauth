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

/**
 * Guard for loading routes that require authentication.
 *
 * @param {LoadGuardOptions<In, Out>} options - Options for the load guard.
 * @returns {Promise<AuthReturn<Out>>} - A function to load the route if authenticated.
 * @throws {Redirect} Throws a redirect with status code 303 if the user is not authenticated.
 */
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

/**
 * Guard for loading routes that should be public (not requiring authentication).
 *
 * @param {LoadGuardOptions<In, Out>} options - Options for the load guard.
 * @returns {Promise<AuthReturn<Out>>} - A function to load the route if it's public.
 * @throws {Redirect} Throws a redirect with status code 303 if the user is authenticated.
 */
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

/**
 * Middleware for authenticated request handlers.
 *
 * @param {RequestHandler} requestHandler - The request handler function
 * @returns {Promise<Response>} - The request handler Response.
 * @throws {Error} Throws an error with status code 401 if the user is not authenticated.
 */
export const onlyAuthenticatedHandler = <In extends RequestEvent>(
	requestHandler: RequestHandler
) => {
	return async (event: In) => {
		const session = await verifySession(event)
		if (!session) {
			throw error(401, { message: 'Unauthorized, no session found' })
		}
		return requestHandler(event)
	}
}

/**
 * Middleware for public request handlers (not requiring authentication).
 *
 * @param {RequestHandler} requestHandler - The request handler function.
 * @returns {Promise} - The request handler Response.
 * @throws {Error} Throws an error with status code 403 if the user is authenticated.
 */
export const onlyPublicHandler = <In extends RequestEvent>(requestHandler: RequestHandler) => {
	return async (event: In) => {
		const session = await verifySession(event)
		if (session) {
			throw error(403, {
				message: 'Session found, but user cannot access only public handler',
			})
		}
		return requestHandler(event)
	}
}

/**
 * Creates a handle for protecting a route group based on a specified base route and redirecting unauthorized access.
 *
 * @param {HandleGuardOptions} options - Options for the handle guard.
 * @returns {Handle} - A SvelteKit handle function to protect routes and handle unauthorized access.
 * @throws {Redirect} Throws a redirect with status code 303 if the user is not authenticated.
 */
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

/**
 * Creates a handle for protecting a public route group based on a specified base route and redirecting authenticated access.
 *
 * @param {HandleGuardOptions} options - Options for the handle guard.
 * @returns {Handle} - A SvelteKit handle function to protect public routes and handle authenticated access.
 * @throws {Redirect} Throws a redirect with status code 303 if the user is authenticated.
 */
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
