import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import type { ClientAuth } from '../server'

/**
 * Creates a Firebase Authentication instance for client-side use.
 *
 * @param {FirebaseOptions} config - Configuration options for Firebase Authentication.
 * @returns {ClientAuth} The Firebase Authentication instance for client-side use.
 */
export const createFirebaseAuth = (config: FirebaseOptions): ClientAuth => {
	const firebaseApp = getApps().length === 0 ? initializeApp(config) : getApp()
	return getAuth(firebaseApp)
}
