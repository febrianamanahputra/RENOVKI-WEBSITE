import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

// Only initialize if we have the API key
const isConfigured = !!firebaseConfig.apiKey;
const app = isConfigured && !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

export const db = isConfigured ? getFirestore(app) : null as any;
export const auth = isConfigured ? getAuth(app) : null as any;
export const googleProvider = isConfigured ? new GoogleAuthProvider() : null as any;

export const signInWithGoogle = async () => {
  if (!auth || !googleProvider) throw new Error("Firebase is not configured.");
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Error signing in with Google:", error);
    throw new Error(error?.message || "Error signing in");
  }
};

export const logOut = async () => {
  if (!auth) throw new Error("Firebase is not configured.");
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error("Error signing out:", error);
    throw new Error(error?.message || "Error signing out");
  }
};

// Custom safe onAuthStateChanged
const safeOnAuthStateChanged = (callback: (user: any) => void) => {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

export { safeOnAuthStateChanged as onAuthStateChanged };
