import { createFirebaseAuth } from '$lib/client'

export const load = ({ data }) => ({
	auth: createFirebaseAuth(data.authConfig),
	session: data.session,
})
