import type { Handle } from '@sveltejs/kit'
import { createAuthHandle } from '$lib/server'
import {
	PUBLIC_API_KEY,
	PUBLIC_APP_ID,
	PUBLIC_AUTH_DOMAIN,
	PUBLIC_DATABASE_URL,
	PUBLIC_MESSAGING_SENDER_ID,
	PUBLIC_PROJECT_ID,
	PUBLIC_STORAGE_BUCKET,
} from '$env/static/public'
// import { FIREBASE_SERVICE_ACCOUNT_KEY } from '$env/static/private'

export const handle: Handle = createAuthHandle({
	// Your web app's Firebase configuration
	// Using environment variables is not required in your project
	firebaseConfig: {
		apiKey: PUBLIC_API_KEY,
		authDomain: PUBLIC_AUTH_DOMAIN,
		databaseURL: PUBLIC_DATABASE_URL,
		projectId: PUBLIC_PROJECT_ID,
		storageBucket: PUBLIC_STORAGE_BUCKET,
		messagingSenderId: PUBLIC_MESSAGING_SENDER_ID,
		appId: PUBLIC_APP_ID,
	},
	// Optional. Just set the FIREBASE_SERVICE_ACCOUNT_KEY environment variable and the library will pick it up
	// serviceAccountKey: FIREBASE_SERVICE_ACCOUNT_KEY,
	// Optional. Refresh token cookie expire time, default 30 days
	// refreshExpireTime: 60 * 60 * 24 * 30,
})
