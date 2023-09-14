import { redirect, type Cookies, type RequestEvent } from '@sveltejs/kit'
import {
	setPersistence,
	inMemoryPersistence,
	signInWithEmailAndPassword,
	createUserWithEmailAndPassword,
} from 'firebase/auth'
import { dev } from '$app/environment'
import {
	AuthCookies,
	type CookieData,
	type CustomTokenResponse,
	type RefreshTokenResponse,
	type SessionCookies,
	type Session,
	type CredentialsLogin,
	type TokenLogin,
	type UserSession,
} from './types'

const loginURL = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken'
const refreshTokenURL = 'https://securetoken.googleapis.com/v1/token'

// ---------- LOGIN LOGIC ------------
/**
 * Sets an authentication cookie with the specified name, data, and expiration.
 *
 * @param {Cookies} cookies - An object for managing cookies.
 * @param {CookieData} options - Configuration options for the cookie.
 */
const setAuthCookie = (cookies: Cookies, { name, data, expiresIn }: CookieData) => {
	cookies.set(name, data, {
		path: '/',
		httpOnly: true,
		sameSite: 'strict',
		secure: !dev,
		maxAge: expiresIn, // in seconds
	})
}

/**
 * Creates and sets authentication cookies for a user session.
 *
 * @param {RequestEvent} requestEvent - The SvelteKit request event object.
 * @param {SessionCookies} data - Data for creating session cookies.
 */
const createSessionCookies = async ({ cookies, locals }: RequestEvent, data: SessionCookies) => {
	const admin = locals.auth.getAdminAuth()
	const { idToken, customToken, refreshToken, expiresIn } = data
	// expiresIn is in milliseconds
	const sessionCookie = await admin.createSessionCookie(idToken, {
		expiresIn: expiresIn * 1000,
	})
	setAuthCookie(cookies, { name: AuthCookies.SESSION, data: sessionCookie, expiresIn })
	setAuthCookie(cookies, { name: AuthCookies.CUSTOM, data: customToken, expiresIn })
	setAuthCookie(cookies, {
		name: AuthCookies.REFRESH,
		data: refreshToken,
		expiresIn: locals.auth.refreshExpireTime,
	})
}

/**
 * Fetches authentication tokens by exchanging a custom token with Firebase Authentication.
 *
 * @param {RequestEvent} requestEvent - The SvelteKit request event object.
 * @param {string} customToken - The custom token to exchange for authentication tokens.
 * @throws {Error} Throws an error if the fetch operation fails or if authentication fails.
 * @returns {Promise} - An object containing authentication tokens and their expiration.
 */
const fetchAuthTokens = async ({ fetch, locals }: RequestEvent, customToken: string) => {
	const { apiKey } = locals.auth.config
	const url = `${loginURL}?key=${apiKey}`
	const response = await fetch(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ token: customToken, returnSecureToken: true }),
	})
	if (!response.ok) {
		throw new Error('[Auth]: Failed to sign in with custom token')
	}
	const { expiresIn, ...rest }: CustomTokenResponse = await response.json()
	return { ...rest, expiresIn: +expiresIn }
}

/**
 * Logs in a user with email and password credentials, creates custom tokens, and sets authentication cookies.
 *
 * @param {CredentialsLogin} options - Options for logging in with credentials.
 * @returns {Promise<string>} - The custom token for the logged-in user.
 */
export const loginWithCredentials = async ({ event, email, password }: CredentialsLogin) => {
	const admin = event.locals.auth.getAdminAuth()
	const client = event.locals.auth.getClientAuth()
	await setPersistence(client, inMemoryPersistence)
	const { user } = await signInWithEmailAndPassword(client, email, password)
	const customToken = await admin.createCustomToken(user.uid)
	const { idToken, refreshToken, expiresIn } = await fetchAuthTokens(event, customToken)
	await createSessionCookies(event, { idToken, refreshToken, customToken, expiresIn })
	return customToken
}

/**
 * Logs in a user with an ID token, creates custom tokens, and sets authentication cookies.
 *
 * @param {TokenLogin} options - Options for logging in with an ID token.
 * @returns {Promise<string>} - The custom token for the logged-in user.
 */
export const loginWithIdToken = async ({ event, token }: TokenLogin) => {
	const admin = event.locals.auth.getAdminAuth()
	const { uid } = await admin.verifyIdToken(token, true)
	const customToken = await admin.createCustomToken(uid)
	const { idToken, refreshToken, expiresIn } = await fetchAuthTokens(event, customToken)
	await createSessionCookies(event, { idToken, refreshToken, customToken, expiresIn })
	return customToken
}

// --------- SIGNUP LOGIC -----------
/**
 * Signs up a new user with email and password credentials, creates custom tokens, and sets authentication cookies.
 *
 * @param {CredentialsLogin} options - Options for signing up with credentials.
 * @returns {Promise<{ token: string, user: UserCredential }>} - An object containing the custom token and user information for the newly signed-up user.
 */
export const signupWithCredentials = async ({ event, email, password }: CredentialsLogin) => {
	const admin = event.locals.auth.getAdminAuth()
	const client = event.locals.auth.getClientAuth()
	await setPersistence(client, inMemoryPersistence)
	const { user } = await createUserWithEmailAndPassword(client, email, password)
	const customToken = await admin.createCustomToken(user.uid)
	const { idToken, refreshToken, expiresIn } = await fetchAuthTokens(event, customToken)
	await createSessionCookies(event, { idToken, refreshToken, customToken, expiresIn })
	return { token: customToken, user }
}

// ---------- LOGOUT LOGIC -----------
/**
 * Signs out a user by deleting authentication cookies and initiating a redirection.
 *
 * @param {{ cookies: Cookies, redirectRoute?: string }} options - Options for signing out.
 * @throws {Redirect} Throws a redirect with a status code of 303.
 */
export const signOut = ({
	cookies,
	redirectRoute = '/',
}: {
	cookies: Cookies
	redirectRoute?: string
}) => {
	cookies.delete(AuthCookies.SESSION, { path: '/' })
	cookies.delete(AuthCookies.REFRESH, { path: '/' })
	cookies.delete(AuthCookies.CUSTOM, { path: '/' })
	throw redirect(303, redirectRoute)
}

// ---------- REFRESH LOGIC -----------
/**
 * Refreshes an ID token using a refresh token provided by Firebase Authentication.
 *
 * @param {RequestEvent} requestEvent - The SvelteKit request event object.
 * @param {string} refreshToken - The refresh token to use for token refresh.
 * @returns {Promise<{} | null>} - An object containing refreshed tokens and their expiration, or null if the refresh fails.
 */
const refreshIdToken = async ({ fetch, locals }: RequestEvent, refreshToken: string) => {
	const { apiKey } = locals.auth.config
	const url = `${refreshTokenURL}?key=${apiKey}`
	const response = await fetch(url, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
	})
	if (!response.ok) {
		return null
	}
	const { expires_in, ...rest }: RefreshTokenResponse = await response.json()
	return { ...rest, expiresIn: +expires_in }
}

/**
 * Refreshes the user's session by using a refresh token and updating authentication cookies.
 *
 * @param {RequestEvent} event - The SvelteKit request event object.
 * @returns {Promise<Session | null>} - An object representing the refreshed user session, or null if the session cannot be refreshed.
 */
const refreshUserSession = async (event: RequestEvent): Promise<Session | null> => {
	const { cookies, locals } = event
	const refreshToken = cookies.get(AuthCookies.REFRESH)
	if (!refreshToken) {
		return null
	}
	const refreshResponse = await refreshIdToken(event, refreshToken)
	if (!refreshResponse) {
		return null
	}
	const admin = locals.auth.getAdminAuth()
	const { refresh_token, id_token, expiresIn } = refreshResponse
	try {
		const { uid } = await admin.verifyIdToken(id_token, true)
		const customToken = await admin.createCustomToken(uid)
		await createSessionCookies(event, {
			idToken: id_token,
			refreshToken: refresh_token,
			customToken,
			expiresIn,
		})
		return { uid, token: customToken }
	} catch (error) {
		return null
	}
}

/**
 * Verifies and retrieves the user's session, either from cookies or by refreshing it if needed.
 *
 * @param {RequestEvent} event - The SvelteKit request event object.
 * @returns {Promise<Session | null>} - An object representing the user's session, or null if no valid session is found.
 */
export const verifySession = async (event: RequestEvent): Promise<Session | null> => {
	const { cookies, locals } = event
	const session = cookies.get(AuthCookies.SESSION)
	if (!session) {
		return refreshUserSession(event)
	}
	const admin = locals.auth.getAdminAuth()
	try {
		const { uid } = await admin.verifySessionCookie(session, true)
		let customToken = cookies.get(AuthCookies.CUSTOM)
		if (!customToken) {
			customToken = await admin.createCustomToken(uid)
			const expiresIn = Date.now() / 1000 + 3600
			setAuthCookie(cookies, { name: AuthCookies.CUSTOM, data: customToken, expiresIn })
		}
		return { uid, token: customToken }
	} catch (e) {
		return refreshUserSession(event)
	}
}

/**
 * Verifies and retrieves the user's session, including user information, if a valid session exists.
 *
 * @param {RequestEvent} event - The SvelteKit request event object.
 * @returns {Promise<UserSession | null>} - An object representing the user's session and user information, or null if no valid session is found.
 */
export const verifyUserSession = async (event: RequestEvent): Promise<UserSession | null> => {
	const session = await verifySession(event)
	if (!session) {
		return null
	}
	const admin = event.locals.auth.getAdminAuth()
	const { uid, email, emailVerified, disabled, displayName, phoneNumber, photoURL } =
		await admin.getUser(session.uid)
	const user = {
		uid,
		email,
		emailVerified,
		disabled,
		displayName,
		phoneNumber,
		photoURL,
	}
	return { ...session, user }
}
