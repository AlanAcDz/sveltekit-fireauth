import { onAuthStateChanged, signInWithCustomToken, signOut } from 'firebase/auth'
import type { FirebaseAuth, Session } from '../server'

export const syncAuthState = (auth: FirebaseAuth, session: Session | null) => {
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
