import type { Handle } from '@sveltejs/kit'
import { createAuthHandle } from '$lib/server'
import { env } from '$env/dynamic/public'
// import { FIREBASE_SERVICE_ACCOUNT_KEY } from '$env/static/private'

export const handle: Handle = createAuthHandle({
	// Your web app's Firebase configuration
	// Using environment variables is not required in your project
	firebaseConfig: {
		apiKey: env.PUBLIC_API_KEY,
		authDomain: env.PUBLIC_AUTH_DOMAIN,
		databaseURL: env.PUBLIC_DATABASE_URL,
		projectId: env.PUBLIC_PROJECT_ID,
		storageBucket: env.PUBLIC_STORAGE_BUCKET,
		messagingSenderId: env.PUBLIC_MESSAGING_SENDER_ID,
		appId: env.PUBLIC_APP_ID,
	},
	// Optional. Just set the FIREBASE_SERVICE_ACCOUNT_KEY environment variable and the library will pick it up
	// serviceAccountKey: FIREBASE_SERVICE_ACCOUNT_KEY,
	// Optional. Refresh token cookie expire time, default 30 days
	// refreshExpireTime: 60 * 60 * 24 * 30,
})
