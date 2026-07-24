'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { MonthlyBucket } from '../types';

export interface MonthlyPoint extends MonthlyBucket {
  /** 'YYYY-MM' */
  month: string;
}

/**
 * The monthly money-flow rollup — one document read, all history, constant cost.
 *
 * Returns the last `monthsBack` calendar months (oldest→newest, always contiguous so the chart has
 * no gaps), each filled from the aggregate or zeroed if that month has no activity.
 */
export function useMonthlyAggregate(userId: string | null, monthsBack = 6) {
  const [months, setMonths] = useState<Record<string, MonthlyBucket>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    setError(false);

    const ref = doc(db, 'users', userId, 'aggregates', 'monthly');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setMonths((snap.data()?.months as Record<string, MonthlyBucket>) ?? {});
        setError(false);
        setLoading(false);
      },
      () => { setError(true); setLoading(false); }
    );
    return unsub;
  }, [userId]);

  // Build a contiguous window ending this month so the trend never has holes.
  const series: MonthlyPoint[] = [];
  const now = new Date();
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const b = months[key];
    series.push({ month: key, income: b?.income ?? 0, spending: b?.spending ?? 0 });
  }

  return { series, loading, error };
}
