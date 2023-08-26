# sveltekit-fireauth

A SvelteKit library for seamless server-side authentication using Firebase Authentication.

Partially inspired by [next-firebase-auth](https://github.com/gladly-team/next-firebase-auth), check out its discussion of [when (not) to use this package](https://github.com/gladly-team/next-firebase-auth#when-not-to-use-this-package).

## Quick start

This guide will assume your app uses typescript. If not, why?

1. Install this package with peer dependencies

```bash
 npm i sveltekit-fireauth firebase firebase-admin
```

2. Set up the required types in `app.d.ts`

```typescript
import type { AdminAuth, FirebaseAuth, Session } from 'sveltekit-fireauth/server'

declare global {
	namespace App {
		interface Locals {
			adminAuth: AdminAuth
			firebaseAuth: FirebaseAuth
			verifySession: () => Promise<Session | null>
		}
	}
}

export {}
```

3. Set up your Firebase's service account credentials in your `.env` file. This will be used to initialize the firebase-admin client.

```
FIREBASE_SERVICE_ACCOUNT_KEY=<your-service-account>
```

4. Set up a handle hook inside `hooks.server.ts`

```typescript
import type { Handle } from '@sveltejs/kit'
import { createAuthHandle } from 'sveltekit-fireauth/server'

export const handle: Handle = createAuthHandle({
	// Your web app's Firebase configuration
	firebaseConfig: {
		apiKey: '',
		authDomain: '',
		projectId: '',
		storageBucket: '',
		messagingSenderId: '',
		appId: '',
	},
	// Optional. Refresh token cookie expire time, default 30 days
	refreshExpireTime: 60 * 60 * 24 * 30,
})
```

You may want to use the [sequence](https://kit.svelte.dev/docs/modules#sveltejs-kit-hooks-sequence) helper function to set up multiple handle hooks, especially if you are going to use this library's other handle hooks.

5. Set up some form actions to log in and log out a user.

```typescript
import { loginWithCredentials, signOut } from 'sveltekit-fireauth/server'

export const actions = {
	login: async (event) => {
		// Get the email and password from the form
		try {
			await loginWithCredentials({ event, email, password })
		} catch (e) {
			throw error(401, { message: 'Unauthorized' })
		}
		throw redirect(303, '/')
	},
	logout: async ({ cookies }) => {
		return signOut({ cookies, redirectRoute: '/login' })
	},
}
```

6. Pass the user's session to the client-side

```typescript
// +layout.server.ts
export const load = async ({ locals }) => ({
	session: locals.verifySession(),
})
```

```typescript
// +layout.ts
export const load = async ({ data }) => ({
	session: data.session,
})
```

```svelte
<!-- +layout.svelte -->
<script lang="ts">
	export let data

	$: ({ session } = data)
</script>

<p>Logged in as user: {session.uid}</p>
```
