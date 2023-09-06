// See https://kit.svelte.dev/docs/types#app
import type { FirebaseAuth } from './lib/server'

// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			auth: FirebaseAuth
		}
		// interface PageData {}
		// interface Platform {}
	}
}

export {}
