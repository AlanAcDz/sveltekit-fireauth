import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { env } from '$env/dynamic/private'
import type { AdminAuth } from './types'

/**
 * Creates a Firebase Admin Authentication instance for server-side use.
 *
 * @param {string} [serviceAccount] - The Firebase service account key in JSON format.
 * @throws {Error} Throws an error if "FIREBASE_SERVICE_ACCOUNT_KEY" is missing in the environment or if the service account key is invalid.
 * @returns {AdminAuth} The Firebase Admin Authentication instance.
 */
export const createAdminAuth = (serviceAccount?: string): AdminAuth => {
	const key = serviceAccount ?? env.FIREBASE_SERVICE_ACCOUNT_KEY
	if (!key) {
		throw new Error(
			'[Auth]: Missing service account key. Either provide it as an argument or set "FIREBASE_SERVICE_ACCOUNT_KEY" in environment'
		)
	}
	const credential = cert(JSON.parse(key))
	const adminApp = getApps().length === 0 ? initializeApp({ credential }) : getApp()
	return getAuth(adminApp)
}
