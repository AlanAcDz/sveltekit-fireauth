import { onAuthStateChanged, signInWithCustomToken, signOut } from 'firebase/auth'
import type { ClientAuth, Session } from '../server'

export { createFirebaseAuth } from '../client/config'

/**
 * Synchronizes the Firebase Authentication state with the session.
 *
 * @param {ClientAuth} auth - The Firebase Authentication instance.
 * @param {Session | null} session - The user session or null if no session is available.
 * @returns {() => void} - A function to unsubscribe from the state synchronization.
 */
export const syncAuthState = (auth: ClientAuth, session: Session | null) => {
	const unsubscribe = onAuthStateChanged(auth, async (user) => {
		if (!user && session) {
			return signInWithCustomToken(auth, session.token)
		}
		if (user && !session) {
			return signOut(auth)
		}
	})
	return unsubscribe
}
