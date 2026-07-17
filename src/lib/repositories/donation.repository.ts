import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Donation } from '../types';

export const donationRepository = {
  async getDonations(userId: string, limitCount = 50): Promise<Donation[]> {
    const q = query(
      collection(db, 'users', userId, 'donations'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Donation));
  },

  async getDonationsByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<Donation[]> {
    const q = query(
      collection(db, 'users', userId, 'donations'),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Donation));
  },
};
