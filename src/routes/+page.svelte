<script lang="ts">
	import { onMount } from 'svelte'
	import { syncAuthState } from '$lib/client'

	export let data

	$: ({ session, auth } = data)

	onMount(() => {
		const unsubscribe = syncAuthState(auth, session)
		return () => {
			unsubscribe()
		}
	})
</script>

{#if data.session}
	<p>User is logged in</p>
	<a href="/protected">Go to protected page</a>
{:else}
	<p>User is not logged in</p>
	<a href="/login">Go to login page</a>
{/if}
