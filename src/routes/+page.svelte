<script lang="ts">
	export let data
</script>

{#if data.session}
	<p>User is logged in</p>
	<a href="/protected">Go to protected page</a>
{:else}
	<p>User is not logged in</p>
	<a href="/login">Go to login page</a>
{/if}
