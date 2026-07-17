import {
  doc,
  getDoc,
  collection,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Fund, FundType } from '../types';

export const fundRepository = {
  async getFund(userId: string, fundId: FundType): Promise<Fund | null> {
    const snap = await getDoc(doc(db, 'users', userId, 'funds', fundId));
    if (!snap.exists()) return null;
    return snap.data() as Fund;
  },

  async getAllFunds(userId: string): Promise<Fund[]> {
    const snap = await getDocs(collection(db, 'users', userId, 'funds'));
    return snap.docs.map((d) => d.data() as Fund);
  },
};
