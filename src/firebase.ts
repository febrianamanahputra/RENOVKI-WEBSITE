import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import localFirebaseConfig from '../firebase-applet-config.json';

// Use Environment Variables for Vercel/Production deployment,
// but fallback to local config when inside AI Studio development.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || localFirebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || localFirebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || localFirebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || localFirebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || localFirebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || localFirebaseConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || localFirebaseConfig.measurementId,
};

const databaseId = import.meta.env.VITE_FIRESTORE_DATABASE_ID || localFirebaseConfig.firestoreDatabaseId;

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, databaseId);
export const auth = getAuth(app);

// Authentication helpers
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
  }
};

// Global error handler helper for standard UI catching
export const handleFirestoreError = (error: any, operationType: 'create'|'update'|'delete'|'list'|'get'|'write', path?: string) => {
   if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
       const user = auth.currentUser;
       const errInfo = {
           error: "Missing or insufficient permissions",
           operationType,
           path: path || null,
           authInfo: user ? {
               userId: user.uid,
               email: user.email,
               emailVerified: user.emailVerified,
               isAnonymous: user.isAnonymous,
               providerInfo: user.providerData.map(p => ({ providerId: p.providerId, displayName: p.displayName, email: p.email }))
           } : null
       };
       console.error("Firestore Permission Error: ", JSON.stringify(errInfo, null, 2));
       throw new Error(JSON.stringify(errInfo));
   }
   console.error(`Firestore ${operationType} Error:`, error);
   throw error;
};

// Test initial connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. Client is offline.");
    }
  }
}
testConnection();
