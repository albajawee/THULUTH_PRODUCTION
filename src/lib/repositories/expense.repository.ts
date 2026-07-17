import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Expense, FundType } from '../types';

export const expenseRepository = {
  async getExpensesByFund(
    userId: string,
    fundType: FundType,
    limitCount = 50
  ): Promise<Expense[]> {
    const q = query(
      collection(db, 'users', userId, 'expenses'),
      where('fundType', '==', fundType),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense));
  },

  async getExpensesByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<Expense[]> {
    const q = query(
      collection(db, 'users', userId, 'expenses'),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense));
  },
};
