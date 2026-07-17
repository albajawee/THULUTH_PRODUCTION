'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Expense, FundType } from '../types';

export function useExpenses(userId: string | null, fundType?: FundType, limitCount = 50) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [indexBuilding, setIndexBuilding] = useState(false);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    const constraints: Parameters<typeof query>[1][] = [
      orderBy('createdAt', 'desc'),
      limit(limitCount),
    ];
    if (fundType) constraints.unshift(where('fundType', '==', fundType));

    const q = query(collection(db, 'users', userId, 'expenses'), ...constraints);

    const unsub = onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense)));
      setIndexBuilding(false);
      setLoading(false);
    }, (err) => {
      if (err.code === 'failed-precondition') {
        setIndexBuilding(true);
      }
      setLoading(false);
    });

    return unsub;
  }, [userId, fundType, limitCount]);

  return { expenses, loading, indexBuilding };
}
