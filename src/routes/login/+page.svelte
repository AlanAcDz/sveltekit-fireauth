<script lang="ts">
	import { invalidateAll } from '$app/navigation'
	import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'

	export let data

	const googleLogin = async () => {
		try {
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
		} catch (error) {
			console.log(error)
		}
	}
</script>

<a href="/">Back to home</a>
<p>If you have an existing account, log in</p>
<form action="?/login" method="POST">
	<label>
		<span>Email</span>
		<input type="email" name="email" />
	</label>
	<label>
		<span>Password</span>
		<input type="password" name="password" />
	</label>
	<button>Log in</button>
</form>

<br />
<button on:click={googleLogin}>Sign in with Google</button>

<p>Or create an account if you don't have one yet</p>
<form action="?/signup" method="POST">
	<label>
		<span>Email</span>
		<input type="email" name="email" />
	</label>
	<label>
		<span>Password</span>
		<input type="password" name="password" />
	</label>
	<button>Create account</button>
</form>
