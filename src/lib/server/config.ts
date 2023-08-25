import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FIREBASE_SERVICE_ACCOUNT_KEY } from '$env/static/private'

const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT_KEY)

export const createAdminAuth = () => {
	if (!FIREBASE_SERVICE_ACCOUNT_KEY) {
		throw new Error('Missing "FIREBASE_SERVICE_ACCOUNT_KEY" in environment')
	}
	const adminApp =
		getApps().length === 0
			? initializeApp({
					credential: cert(serviceAccount),
			  })
			: getApp()
	return getAuth(adminApp)
}
