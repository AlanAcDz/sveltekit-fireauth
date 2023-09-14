# sveltekit-fireauth

A SvelteKit library for seamless server-side authentication using Firebase Authentication.

Partially inspired by [next-firebase-auth](https://github.com/gladly-team/next-firebase-auth), check out its discussion of [when (not) to use this package](https://github.com/gladly-team/next-firebase-auth#when-not-to-use-this-package).

## Quick start

This guide will assume your app uses typescript

1. Install this package with peer dependencies

```bash
 npm i sveltekit-fireauth firebase firebase-admin
```

2. Set up the required types in `app.d.ts`

```typescript
import type { FirebaseAuth } from 'sveltekit-fireauth/server'

declare global {
	namespace App {
		interface Locals {
			auth: FirebaseAuth
		}
	}
}

export {}
```

3. Set up a handle hook inside `hooks.server.ts`

```typescript
import type { Handle } from '@sveltejs/kit'
import { createAuthHandle } from 'sveltekit-fireauth/server'
import { FIREBASE_SERVICE_ACCOUNT_KEY } from '$env/static/private'

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
	// Optional. Just set the FIREBASE_SERVICE_ACCOUNT_KEY environment variable and the library will pick it up
	serviceAccountKey: FIREBASE_SERVICE_ACCOUNT_KEY,
	// Optional. Refresh token cookie expire time, default 30 days
	refreshExpireTime: 60 * 60 * 24 * 30,
})
```

You may want to use the [sequence](https://kit.svelte.dev/docs/modules#sveltejs-kit-hooks-sequence) helper function to set up multiple handle hooks, especially if you are going to use this library's other handle hooks.

4. Set up some form actions to log in and log out a user.

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

5. Pass the user's session to the client-side

```typescript
// +layout.server.ts
import { verifySession } from 'sveltekit-fireauth/server'

export const load = async ({ locals }) => ({
	session: verifySession(),
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
