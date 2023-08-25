// See https://kit.svelte.dev/docs/types#app
import type { AdminAuth, FirebaseAuth, Session } from './lib/server'

// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			adminAuth: AdminAuth
			firebaseAuth: FirebaseAuth
			verifySession: () => Promise<Session | null>
		}
		// interface PageData {}
		// interface Platform {}
	}
}

export {}
