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
} from './types'

const loginURL = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken'
const refreshTokenURL = 'https://securetoken.googleapis.com/v1/token'

// ---------- LOGIN LOGIC ------------
const setAuthCookie = (cookies: Cookies, { name, data, expiresIn }: CookieData) => {
	cookies.set(name, data, {
		path: '/',
		httpOnly: true,
		sameSite: 'strict',
		secure: !dev,
		maxAge: expiresIn, // in seconds
	})
}

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

export const loginWithIdToken = async ({ event, token }: TokenLogin) => {
	const admin = event.locals.auth.getAdminAuth()
	const { uid } = await admin.verifyIdToken(token, true)
	const customToken = await admin.createCustomToken(uid)
	const { idToken, refreshToken, expiresIn } = await fetchAuthTokens(event, customToken)
	await createSessionCookies(event, { idToken, refreshToken, customToken, expiresIn })
	return customToken
}

// --------- SIGNUP LOGIC -----------
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
