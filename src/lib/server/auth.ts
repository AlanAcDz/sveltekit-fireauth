import type { Handle } from '@sveltejs/kit'
import type { FirebaseOptions } from 'firebase/app'
import type { AdminAuth, AuthConfig, ClientAuth } from './types'
import { createFirebaseAuth } from '../client/config'
import { createAdminAuth } from './config'

export class FirebaseAuth {
	refreshExpireTime: number
	config: FirebaseOptions
	private client: ClientAuth
	private admin: AdminAuth
	constructor({ firebaseConfig, refreshExpireTime, serviceAccountKey }: AuthConfig) {
		this.client = createFirebaseAuth(firebaseConfig)
		this.admin = createAdminAuth(serviceAccountKey)
		this.refreshExpireTime = refreshExpireTime ?? 60 * 60 * 24 * 30 // default 30 days
		this.config = firebaseConfig
	}
	getAdminAuth() {
		if (window) {
			throw new Error('[Auth]: Firebase Admin is not supported in the browser')
		}
		return this.admin
	}
	getClientAuth() {
		return this.client
	}
}

export const createAuthHandle = (config: AuthConfig): Handle => {
	return ({ event, resolve }) => {
		if (!event.locals.auth) {
			event.locals.auth = new FirebaseAuth(config)
		}
		return resolve(event)
	}
}
