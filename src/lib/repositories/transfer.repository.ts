import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Transfer } from '../types';

export const transferRepository = {
  async getTransfers(userId: string, limitCount = 50): Promise<Transfer[]> {
    const q = query(
      collection(db, 'users', userId, 'transfers'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transfer));
  },
};
