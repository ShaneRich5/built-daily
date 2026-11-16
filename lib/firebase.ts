import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** True when public Firebase env vars are present (safe on server + client). */
export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId,
  );
}

function hasBrowserConfig(): boolean {
  return typeof window !== "undefined" && isFirebaseConfigured();
}

let app: FirebaseApp | null = null;

/**
 * Lazily initializes the Firebase web app on the client when env vars are set.
 */
export function getFirebaseApp(): FirebaseApp | null {
  if (!hasBrowserConfig()) return null;
  if (!app) {
    app = getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth | null {
  const a = getFirebaseApp();
  return a ? getAuth(a) : null;
}

let db: Firestore | null = null;

/**
 * Firestore with its offline cache kept in IndexedDB, so data you've loaded is
 * there with no signal (the gym basement) and writes made offline are queued and
 * survive closing the app. Browsers without IndexedDB (some private windows) fall
 * back to the in-memory cache on their own.
 */
export function getFirestoreDb(): Firestore | null {
  const a = getFirebaseApp();
  if (!a) return null;
  if (!db) {
    try {
      db = initializeFirestore(a, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      });
    } catch {
      // Already initialized (e.g. after a hot reload): use that instance.
      db = getFirestore(a);
    }
  }
  return db;
}
