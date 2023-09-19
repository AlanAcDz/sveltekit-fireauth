<script lang="ts">
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
