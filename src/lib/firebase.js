/**
 * Firebase initialization for the Last-Minute Life Saver app.
 *
 * Reads configuration from NEXT_PUBLIC_FIREBASE_* environment variables.
 * If no config is provided the module exports `null` for `db` so the rest
 * of the app can fall back to localStorage.
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

/**
 * Check whether a minimum viable Firebase config has been provided.
 * We require at least an API key and a project ID.
 */
const hasConfig =
  Boolean(firebaseConfig.apiKey) && Boolean(firebaseConfig.projectId);

let app = null;
let db = null;

if (hasConfig) {
  // Avoid re-initialising if the app already exists (e.g. HMR in Next.js)
  app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  db = getFirestore(app);
}

export { db, app };
