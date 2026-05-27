import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAwdbWSuhpSlAQsJmJoo1Iodm592aIrB2s",
  authDomain: "expo-go-c23ab.firebaseapp.com",
  projectId: "expo-go-c23ab",
  storageBucket: "expo-go-c23ab.firebasestorage.app",
  messagingSenderId: "436957724818",
  appId: "1:436957724818:web:bc8755fd4cb8850165e64b",
};

// Çift başlatmayı önle
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
