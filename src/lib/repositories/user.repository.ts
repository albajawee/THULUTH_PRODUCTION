import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { UserProfile, UpdateUserSettingsInput } from '../types';

export const userRepository = {
  async getUser(uid: string): Promise<UserProfile | null> {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return snap.data() as UserProfile;
  },

  async createUser(uid: string, data: Omit<UserProfile, 'uid' | 'updatedAt'>): Promise<void> {
    await setDoc(doc(db, 'users', uid), {
      uid,
      ...data,
      updatedAt: new Date().toISOString(),
    });
  },

  async updateUser(uid: string, data: UpdateUserSettingsInput): Promise<void> {
    await updateDoc(doc(db, 'users', uid), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  },
};
