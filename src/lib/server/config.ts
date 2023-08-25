import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FIREBASE_SERVICE_ACCOUNT_KEY } from '$env/static/private'

const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT_KEY)

const adminApp =
	getApps().length === 0
		? initializeApp({
				credential: cert(serviceAccount),
		  })
		: getApp()

export const adminAuth = getAuth(adminApp)
