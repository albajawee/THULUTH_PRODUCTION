'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Donation } from '../types';

export function useDonations(userId: string | null, limitCount = 50) {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    const q = query(
      collection(db, 'users', userId, 'donations'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const unsub = onSnapshot(q, (snap) => {
      setDonations(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Donation)));
      setLoading(false);
    }, () => setLoading(false));

    return unsub;
  }, [userId, limitCount]);

  const totalDonated = donations.reduce((s, d) => s + d.amount, 0);

  return { donations, totalDonated, loading };
}
