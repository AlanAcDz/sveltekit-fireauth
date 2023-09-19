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

4. Set up some form actions to log in, sign up and log out a user.

```typescript
import { loginWithCredentials, signupWithCredentials, signOut } from 'sveltekit-fireauth/server'

export const actions = {
  login: async (event) => {
    // Get the email and password from the form
    try {
      await loginWithCredentials({ event, email, password })
    } catch (e) {
      throw error(401, { message: 'Unauthorized' })
    }
    throw redirect(303, '/protected')
  },
  signup: async (event) => {
    // Get the email and password from the form
    try {
      await signupWithCredentials({ event, email, password })
    } catch (e) {
      throw error(401, { message: 'Account cannot be created' })
    }
    throw redirect(303, '/protected')
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
// /protected/+page.server.ts
import { onlyAuthenticatedLoad } from 'sveltekit-fireauth/server'

export const load = onlyAuthenticatedLoad({
  redirectRoute: '/login',
  load: () => {
    // regular load function here
  },
})
```

Passing a load function is optional, in case a particular page does not load anything from the server.

```typescript
// /protected/+page.server.ts
import { onlyAuthenticatedLoad } from 'sveltekit-fireauth/server'

export const load = onlyAuthenticatedLoad({
  redirectRoute: '/login',
})
```

This approach gives you the flexibility to handle authentication on a per page basis and without introducing waterfalls. This also seems to be the recommended approach to handle authentication in SvelteKit, at least as a TLDR from [this discussion](https://github.com/sveltejs/kit/issues/6315).

However, I'm aware this approach also introduces some overhead, having to call `onlyAuthenticatedLoad` on every page you want to protect. So this library also includes a `createProtectedRoutesHandle` for you to use in your `hooks.server.ts`.

```typescript
import { createAuthHandle } from 'sveltekit-fireauth/server'

const protectedRoutesHandle: Handle = createProtectedRoutesHandle({
  baseRoute: '/protected', // the group of routes you want to protect
  redirectRoute: '/login',
})

export const handle = sequence(/* ... */)
```

There also exists `onlyPublicLoad` and `createPublicRoutesHandle` functions for you to keep your authenticated users out of your login page (or any page you want).

### Syncing authentication state with the client

If you're using the Firebase SDK on the client and have security rules for Firestore or Storage you will need to sync the server-side session with the client.

1. In a `+layout.server.ts` file load the session and auth config object. This object is the Firebase SDK config object. If you're creating your own Firebase SDK client you don't need to load auth config here

```typescript
// +layout.server.ts
import { verifySession } from 'sveltekit-fireauth/server'

export const load = (event) => ({
  authConfig: event.locals.auth.config,
  session: verifySession(event),
})
```

2. In the `+layout.ts` file get the session that was loaded from the server and create the Firebase Auth client using the auth config. If you're creating your own Firebase SDK client you don't need to create the Firebase Auth client here.

```typescript
// +layout.ts
import { createFirebaseAuth } from 'sveltekit-fireauth/client'

export const load = ({ data }) => ({
  auth: createFirebaseAuth(data.authConfig),
  session: data.session,
})
```

3. In the `+layout.svelte` file use the `syncAuthState` function inside an onMount callback.

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

### OAuth

It's possible to use OAuth with this library, however it requires a bit more setup, specially if you're using form actions. You may want to use an API route instead.

Assuming you're using an API route, here's what you need:

1. Setup the API route. This is going to receive an ID token and use the `loginWithIdToken` helper to log in the user.

```typescript
// /login/oauth/+server.ts
import { error, json } from '@sveltejs/kit'
import { loginWithIdToken } from 'sveltekit-fireauth/server'

export const POST = async (event) => {
  const { token } = await event.request.json()
  if (!token) {
    throw error(400, { message: 'Missing token' })
  }
  try {
    await loginWithIdToken({ event, token })
  } catch (e) {
    throw error(401, { message: 'Unauthorized' })
  }
  return json({ success: true })
}
```

2. Next setup your login button with an on click handler. We'll use Google sign in for this example. Notice how in this case we sign in on the client first to get the ID token and then on the server with that token.

```svelte
<script lang="ts">
  import { invalidateAll } from '$app/navigation'
  import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'

  export let data

  const googleLogin = async () => {
    const provider = new GoogleAuthProvider()
    const { user } = await signInWithPopup(data.auth, provider)
    const token = user.getIdToken()
    const response = await fetch('/login/oauth', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
    if (!response.ok) {
      // handle login failure
      await signOut(data.auth)
    }
    await invalidateAll()
  }
</script>

<button on:click={googleLogin}>Sign in with Google</button>
```
