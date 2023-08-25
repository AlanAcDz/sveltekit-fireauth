import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app'
import { getAuth } from 'firebase/auth'

export const createFirebaseAuth = (config: FirebaseOptions) => {
	const firebaseApp = getApps().length === 0 ? initializeApp(config) : getApp()
	return getAuth(firebaseApp)
}
