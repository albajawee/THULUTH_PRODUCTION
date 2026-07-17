import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Income } from '../types';

export const incomeRepository = {
  async getIncomes(userId: string, limitCount = 50): Promise<Income[]> {
    const q = query(
      collection(db, 'users', userId, 'incomes'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Income));
  },

  async getIncomesByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<Income[]> {
    const q = query(
      collection(db, 'users', userId, 'incomes'),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Income));
  },
};
