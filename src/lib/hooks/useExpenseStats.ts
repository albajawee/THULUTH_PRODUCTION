'use client';

import { useState, useEffect } from 'react';
import { doc, collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { FundType, FundExpenseStats } from '../types';

/**
 * Analytics feed for one fund — deliberately independent of the expense history list.
 *
 * Two constant-cost realtime reads, no matter how many expenses exist:
 *   1. the maintained rollup doc `expense_stats/{fundType}` — totals and per-category sums;
 *   2. the single highest expense (`orderBy amount desc limit 1`) — the one metric that isn't a
 *      running sum, so it's read live rather than stored (always correct, including after a
 *      delete, with no counter to keep in step).
 *
 * Nothing here reads the expenses list or knows about pagination, so loading more history can
 * never change what the charts show, and the charts always describe 100% of the fund's expenses.
 */
export function useExpenseStats(userId: string | null, fundType: FundType) {
  const [stats, setStats] = useState<FundExpenseStats | null>(null);
  const [maxAmount, setMaxAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  // Distinguishes "the rollup could not be read" (permission denied, e.g. the read rule isn't
  // deployed) from "the rollup says zero". Both used to collapse into an empty state, which made a
  // deploy/backfill gap look like a fund with no expenses.
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    setError(false);

    const statsRef = doc(db, 'users', userId, 'expense_stats', fundType);
    const unsubStats = onSnapshot(
      statsRef,
      (snap) => {
        const d = snap.data();
        setStats({
          fundType,
          totalSpent: d?.totalSpent ?? 0,
          count: d?.count ?? 0,
          categories: d?.categories ?? {},
          updatedAt: d?.updatedAt ?? '',
        });
        setError(false);
        setLoading(false);
      },
      () => { setError(true); setLoading(false); }
    );

    const topQ = query(
      collection(db, 'users', userId, 'expenses'),
      where('fundType', '==', fundType),
      orderBy('amount', 'desc'),
      limit(1)
    );
    const unsubTop = onSnapshot(
      topQ,
      (snap) => setMaxAmount(snap.empty ? 0 : ((snap.docs[0].data().amount as number) ?? 0)),
      () => setMaxAmount(0)
    );

    return () => { unsubStats(); unsubTop(); };
  }, [userId, fundType]);

  return { stats, maxAmount, loading, error };
}
