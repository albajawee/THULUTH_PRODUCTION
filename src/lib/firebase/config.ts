import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

/**
 * Firestore with an on-disk cache instead of the SDK default, which is memory-only.
 *
 * This is what stops a weak connection from freezing the app. On a stalled network `onSnapshot`
 * does not fail — it retries quietly and simply never delivers a first snapshot, so every screen
 * whose `loading` flag is cleared by that snapshot sits on skeletons indefinitely, with no error
 * to react to. With a persistent cache the listener fires immediately from IndexedDB (flagged
 * `metadata.fromCache`), so the dashboard paints the last known figures at once and quietly
 * reconciles when the connection returns. It also survives reloads, so this holds on a cold start.
 *
 * `persistentMultipleTabManager` shares that cache safely across tabs; the single-tab manager
 * would make the second tab fail to acquire the lease.
 */
function createFirestore() {
  // Next renders client components on the server too, where there is no IndexedDB. The server pass
  // never reads user data, so a plain in-memory instance is all it needs.
  if (typeof window === 'undefined') return getFirestore(app);

  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    // Thrown when Firestore is already initialised for this app (dev fast-refresh re-runs this
    // module) or when storage is unavailable (private browsing, blocked site data). Falling back
    // to the in-memory instance costs offline reads but keeps the app working.
    return getFirestore(app);
  }
}

export const auth = getAuth(app);
export const db = createFirestore();
export const storage = getStorage(app);
export default app;
