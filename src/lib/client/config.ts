import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
	apiKey: '',
	authDomain: '',
	databaseURL: '',
	projectId: '',
	storageBucket: '',
	messagingSenderId: '',
	appId: '',
	measurementId: '',
}

export const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

export const firebaseAuth = getAuth(firebaseApp)

export const getPublicApiKey = () => firebaseConfig.apiKey
