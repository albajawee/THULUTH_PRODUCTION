import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Goal } from '../types';

export const goalRepository = {
  async getGoals(userId: string): Promise<Goal[]> {
    const q = query(
      collection(db, 'users', userId, 'goals'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Goal));
  },

  async getGoalById(userId: string, goalId: string): Promise<Goal | null> {
    const snap = await getDoc(doc(db, 'users', userId, 'goals', goalId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Goal;
  },

  async getActiveGoals(userId: string, limitCount = 10): Promise<Goal[]> {
    const q = query(
      collection(db, 'users', userId, 'goals'),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Goal));
  },
};
