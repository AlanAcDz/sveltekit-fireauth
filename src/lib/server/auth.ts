import type { Handle } from '@sveltejs/kit'
import type { FirebaseOptions } from 'firebase/app'
import type { AdminAuth, AuthConfig, ClientAuth } from './types'
import { createFirebaseAuth } from '../client/config'
import { createAdminAuth } from './config'

/**
 * Firebase Authentication manager for server-side authentication.
 */
export class FirebaseAuth {
	refreshExpireTime: number
	config: FirebaseOptions
	client: ClientAuth
	admin: AdminAuth
	/**
	 * Create a new instance of FirebaseAuth.
	 *
	 * @param {AuthConfig} config - Configuration options for Firebase Authentication.
	 */
	constructor({ firebaseConfig, refreshExpireTime, serviceAccountKey }: AuthConfig) {
		this.client = createFirebaseAuth(firebaseConfig)
		this.admin = createAdminAuth(serviceAccountKey)
		this.refreshExpireTime = refreshExpireTime ?? 60 * 60 * 24 * 30 // default 30 days
		this.config = firebaseConfig
	}
}

/**
 * Creates an authentication handle for server-side authentication using Firebase.
 *
 * @param {AuthConfig} config - Configuration options for Firebase Authentication.
 * @returns {Handle} - A SvelteKit handle function that manages authentication.
 */
export const createAuthHandle = (config: AuthConfig): Handle => {
	return ({ event, resolve }) => {
		if (!event.locals.auth) {
			event.locals.auth = new FirebaseAuth(config)
		}
		return resolve(event)
	}
}
