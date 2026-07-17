'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Transfer } from '../types';

export function useTransfers(userId: string | null, limitCount = 50) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    const q = query(
      collection(db, 'users', userId, 'transfers'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const unsub = onSnapshot(q, (snap) => {
      setTransfers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transfer)));
      setLoading(false);
    }, () => setLoading(false));

    return unsub;
  }, [userId, limitCount]);

  return { transfers, loading };
}
