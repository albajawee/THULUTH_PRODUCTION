import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from './config';

export async function signIn(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const token = await credential.user.getIdToken();
  document.cookie = `firebase-auth-token=${token}; path=/; max-age=3600; SameSite=Lax`;
  return credential;
}

export async function signUp(email: string, password: string, displayName: string) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });
  const token = await credential.user.getIdToken();
  document.cookie = `firebase-auth-token=${token}; path=/; max-age=3600; SameSite=Lax`;
  return credential;
}

export async function logOut() {
  document.cookie = 'firebase-auth-token=; path=/; max-age=0; SameSite=Lax';
  return signOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}
