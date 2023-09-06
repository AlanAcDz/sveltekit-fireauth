import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FIREBASE_SERVICE_ACCOUNT_KEY } from '$env/static/private'

export const createAdminAuth = (serviceAccount?: string) => {
	if (!FIREBASE_SERVICE_ACCOUNT_KEY) {
		throw new Error('[Auth]: Missing "FIREBASE_SERVICE_ACCOUNT_KEY" in environment')
	}
	const credential = cert(JSON.parse(serviceAccount ?? FIREBASE_SERVICE_ACCOUNT_KEY))
	const adminApp = getApps().length === 0 ? initializeApp({ credential }) : getApp()
	return getAuth(adminApp)
}
