import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Transaction } from '../types';

export const transactionRepository = {
  async getRecentTransactions(userId: string, limitCount = 20): Promise<Transaction[]> {
    const q = query(
      collection(db, 'users', userId, 'transactions'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction));
  },
};
