'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Income } from '../types';

export function useIncome(userId: string | null, limitCount = 50) {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    const q = query(
      collection(db, 'users', userId, 'incomes'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const unsub = onSnapshot(q, (snap) => {
      setIncomes(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Income)));
      setLoading(false);
    }, () => setLoading(false));

    return unsub;
  }, [userId, limitCount]);

  return { incomes, loading };
}
