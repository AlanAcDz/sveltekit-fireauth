import { redirect, type Cookies, type RequestEvent, type Handle } from '@sveltejs/kit'
import {
	setPersistence,
	inMemoryPersistence,
	signInWithEmailAndPassword,
	createUserWithEmailAndPassword,
} from 'firebase/auth'
import { dev } from '$app/environment'
import { createFirebaseAuth } from '../client/config'
import { createAdminAuth } from './config'
import {
	AuthCookies,
	type CookieData,
	type CustomTokenResponse,
	type RefreshTokenResponse,
	type SessionCookies,
	type Session,
	type CredentialsLogin,
	type TokenLogin,
	type AuthConfig,
} from './types'

let refreshExpireTime = 60 * 60 * 24 * 30 // default 30 days
const loginURL = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken'
const refreshTokenURL = 'https://securetoken.googleapis.com/v1/token'

const setRefreshExpireTime = (time: number) => (refreshExpireTime = time)

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

const createSessionCookies = async (
	{ cookies, locals: { adminAuth } }: RequestEvent,
	data: SessionCookies
) => {
	const { idToken, customToken, refreshToken, expiresIn } = data
	// expiresIn is in milliseconds
	const sessionCookie = await adminAuth.createSessionCookie(idToken, {
		expiresIn: expiresIn * 1000,
	})
	setAuthCookie(cookies, { name: AuthCookies.SESSION, data: sessionCookie, expiresIn })
	setAuthCookie(cookies, { name: AuthCookies.CUSTOM, data: customToken, expiresIn })
	setAuthCookie(cookies, {
		name: AuthCookies.REFRESH,
		data: refreshToken,
		expiresIn: refreshExpireTime,
	})
}

const fetchAuthTokens = async ({ fetch, locals }: RequestEvent, customToken: string) => {
	const { apiKey } = locals.firebaseAuth.config
	const url = `${loginURL}?key=${apiKey}`
	const response = await fetch(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ token: customToken, returnSecureToken: true }),
	})
	if (!response.ok) {
		throw new Error('Failed to sign in with custom token')
	}
	const { expiresIn, ...rest }: CustomTokenResponse = await response.json()
	return { ...rest, expiresIn: +expiresIn }
}

export const loginWithCredentials = async ({ event, email, password }: CredentialsLogin) => {
	const { adminAuth, firebaseAuth } = event.locals
	await setPersistence(firebaseAuth, inMemoryPersistence)
	const { user } = await signInWithEmailAndPassword(firebaseAuth, email, password)
	const customToken = await adminAuth.createCustomToken(user.uid)
	const { idToken, refreshToken, expiresIn } = await fetchAuthTokens(event, customToken)
	await createSessionCookies(event, { idToken, refreshToken, customToken, expiresIn })
	return customToken
}

export const loginWithIdToken = async ({ event, token }: TokenLogin) => {
	const { adminAuth } = event.locals
	const { uid } = await adminAuth.verifyIdToken(token, true)
	const customToken = await adminAuth.createCustomToken(uid)
	const { idToken, refreshToken, expiresIn } = await fetchAuthTokens(event, customToken)
	await createSessionCookies(event, { idToken, refreshToken, customToken, expiresIn })
	return customToken
}

// --------- SIGNUP LOGIC -----------
export const signupWithCredentials = async ({ event, email, password }: CredentialsLogin) => {
	const { adminAuth, firebaseAuth } = event.locals
	await setPersistence(firebaseAuth, inMemoryPersistence)
	const { user } = await createUserWithEmailAndPassword(firebaseAuth, email, password)
	const customToken = await adminAuth.createCustomToken(user.uid)
	const { idToken, refreshToken, expiresIn } = await fetchAuthTokens(event, customToken)
	await createSessionCookies(event, { idToken, refreshToken, customToken, expiresIn })
	return { token: customToken, user }
}

// ---------- LOGOUT LOGIC -----------
export const signOut = (cookies: Cookies, redirectUrl = '/') => {
	cookies.delete(AuthCookies.SESSION, { path: '/' })
	cookies.delete(AuthCookies.REFRESH, { path: '/' })
	cookies.delete(AuthCookies.CUSTOM, { path: '/' })
	throw redirect(303, redirectUrl)
}

// ---------- REFRESH LOGIC -----------
const refreshIdToken = async ({ fetch, locals }: RequestEvent, refreshToken: string) => {
	const { apiKey } = locals.firebaseAuth.config
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
	const {
		cookies,
		locals: { adminAuth },
	} = event
	const refreshToken = cookies.get(AuthCookies.REFRESH)
	if (!refreshToken) {
		return null
	}
	const refreshResponse = await refreshIdToken(event, refreshToken)
	if (!refreshResponse) {
		return null
	}
	const { refresh_token, id_token, expiresIn } = refreshResponse
	try {
		const { uid } = await adminAuth.verifyIdToken(id_token, true)
		const customToken = await adminAuth.createCustomToken(uid)
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

const verifySession = async (event: RequestEvent): Promise<Session | null> => {
	const {
		cookies,
		locals: { adminAuth },
	} = event
	const session = cookies.get(AuthCookies.SESSION)
	if (!session) {
		return refreshUserSession(event)
	}
	try {
		const { uid } = await adminAuth.verifySessionCookie(session, true)
		let customToken = cookies.get(AuthCookies.CUSTOM)
		if (!customToken) {
			customToken = await adminAuth.createCustomToken(uid)
			const expiresIn = Date.now() / 1000 + 3600
			setAuthCookie(cookies, { name: AuthCookies.CUSTOM, data: customToken, expiresIn })
		}
		return { uid, token: customToken }
	} catch (e) {
		return refreshUserSession(event)
	}
}

export const createAuthHandle = ({ firebaseOptions, refreshExpireTime }: AuthConfig): Handle => {
	return ({ event, resolve }) => {
		setRefreshExpireTime(refreshExpireTime)
		event.locals.adminAuth = createAdminAuth()
		event.locals.firebaseAuth = createFirebaseAuth(firebaseOptions)
		event.locals.verifySession = () => verifySession(event)
		return resolve(event)
	}
}
