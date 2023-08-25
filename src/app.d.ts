// See https://kit.svelte.dev/docs/types#app
import type { Session } from './lib/server'

// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			verifySession: () => Promise<Session | null>
		}
		// interface PageData {}
		// interface Platform {}
	}
}

export {}
