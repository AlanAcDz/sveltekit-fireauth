<script lang="ts">
	export let data
</script>

<a href="/">Back to home</a>
{#if data.session}
	<p>Logged in as user: {data.session.user.email}</p>
	<form action="?/logout" method="POST">
		<button>Log out</button>
	</form>
{/if}
