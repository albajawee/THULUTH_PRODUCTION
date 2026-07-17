import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from './config';

/**
 * Hands the ID token to the server, which verifies it and sets an HttpOnly session cookie.
 *
 * The client never writes the auth cookie itself — it can't, and shouldn't be able to: an
 * HttpOnly cookie is invisible to `document.cookie`, which is the entire point.
 */
async function createServerSession(user: User, displayName?: string): Promise<void> {
  const idToken = await user.getIdToken();

  const res = await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, displayName }),
  });

  if (!res.ok) {
    // Don't leave the client believing it is signed in when the server disagrees.
    await signOut(auth);
    throw new Error('Could not establish a session. Please try again.');
  }
}

export async function signIn(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  await createServerSession(credential.user);
  return credential;
}

export async function signUp(email: string, password: string, displayName: string) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });
  // displayName is passed explicitly: the ID token was minted before updateProfile, so its `name`
  // claim is still empty at this point. The server treats it as profile data only, never identity.
  await createServerSession(credential.user, displayName);
  return credential;
}

export async function logOut() {
  try {
    await fetch('/api/session', { method: 'DELETE' });
  } finally {
    // Always clear client state, even if the server call failed.
    await signOut(auth);
  }
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}
