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

If you prefer so, this could be done using request handlers as well.

5. Pass the user's session to the client-side

```typescript
// +layout.server.ts
import { verifySession } from 'sveltekit-fireauth/server'

export const load = (event) => ({
  session: verifySession(event),
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

## Recipes

### Protecting Pages

You can protect a page using the `onlyAuthenticatedLoad` function inside any page's `+page.server.ts` file. For example:

```typescript
// src/routes/protected/+page.server.ts
import { onlyAuthenticatedLoad } from 'sveltekit-fireauth/server'

export const load = onlyAuthenticatedLoad({
  redirectRoute: '/',
  load: () => {
    // regular load function here
  },
})
```

Passing a load function is optional, in case a particular page does not load anything from the server.

```typescript
// src/routes/protected/+page.server.ts
import { onlyAuthenticatedLoad } from 'sveltekit-fireauth/server'

export const load = onlyAuthenticatedLoad({
  redirectRoute: '/',
})
```

This approach gives you the flexibility to handle authentication on a per page basis and without introducing waterfalls. This also seems to be the recommended approach to handle authentication in SvelteKit, at least as a TLDR from [this discussion](https://github.com/sveltejs/kit/issues/6315).

However, I'm aware this approach also introduces some overhead, having to call `onlyAuthenticatedLoad` on every page you want to protect. So this library also includes a `createProtectedRoutesHandle` for you to use in your `hooks.server.ts`.

```typescript
import { createAuthHandle } from 'sveltekit-fireauth/server'

const protectedRoutesHandle: Handle = createProtectedRoutesHandle({
  baseRoute: '/protected', // the group of routes you want to protect
  redirectRoute: '/',
})

export const handle = sequence(/* ... */)
```

There also exists `onlyPublicLoad` and `createPublicRoutesHandle` functions for you to keep your authenticated users out of your login page (or any page you want).

### Syncing authentication state with the client

If you're using the Firebase SDK on the client and have security rules for Firestore or Storage you will need to sync the server-side session with the client.

```typescript
// +layout.server.ts
import { verifySession } from 'sveltekit-fireauth/server'

export const load = (event) => ({
  // if you're creating your own Firebase SDK client you don't need to load auth here
  auth: event.locals.auth.getClientAuth(),
  session: verifySession(event),
})
```

```svelte
<!-- +layout.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { syncAuthState } from 'sveltekit-fireauth/client'

  export let data

  $: ({ session, auth } = data)

  onMount(() => {
    const unsubscribe = syncAuthState(auth, session)
    return () => {
      unsubscribe()
    }
  })
</script>
```
