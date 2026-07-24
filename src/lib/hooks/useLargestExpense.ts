'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Expense } from '../types';

/**
 * The single largest expense across all funds — one `orderBy(amount desc) limit 1` read.
 *
 * Not a stored counter: a maintained max can't be decremented correctly when the top expense is
 * deleted without a re-scan, whereas this query is always right and costs one document. Served by
 * an automatic single-field index on `amount`.
 */
export function useLargestExpense(userId: string | null) {
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);

    const q = query(collection(db, 'users', userId, 'expenses'), orderBy('amount', 'desc'), limit(1));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setExpense(snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as Expense));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [userId]);

  return { expense, loading };
}
