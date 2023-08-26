import type { RequestEvent } from '@sveltejs/kit'

export enum AuthCookies {
	SESSION = 'session',
	REFRESH = 'refreshToken',
	CUSTOM = 'customToken',
}

export interface CustomTokenResponse {
	idToken: string
	refreshToken: string
	expiresIn: string
}

export interface CookieData {
	name: AuthCookies
	data: string
	expiresIn: number
}

export interface RefreshTokenResponse {
	expires_in: string
	token_type: string
	refresh_token: string
	id_token: string
	user_id: string
	project_id: string
}

export interface SessionCookies {
	idToken: string
	customToken: string
	refreshToken: string
	expiresIn: number
}

export interface CredentialsLogin {
	event: RequestEvent
	email: string
	password: string
}

export interface TokenLogin {
	event: RequestEvent
	token: string
}

export interface AuthConfig {
	firebaseConfig: import('firebase/app').FirebaseOptions
	refreshExpireTime: number
}

export interface Session {
	uid: string
	token: string
}

export type AdminAuth = import('firebase-admin').auth.Auth
export type FirebaseAuth = import('firebase/auth').Auth
