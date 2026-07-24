'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { CategoryAggregate, FundType } from '../types';

export interface CombinedExpenseStats {
  totalSpent: number;
  count: number;
  /** Category label -> combined totals across all funds. */
  categories: Record<string, CategoryAggregate>;
  perFund: Record<string, { totalSpent: number; count: number }>;
}

/**
 * Account-wide expense analytics from the maintained `expense_stats` rollups — one collection
 * listener (≤4 docs), never the expenses list. Combines the per-fund rollups into a single view:
 * total spent, transaction count, and a merged category map for the dashboard's distribution and
 * top-categories widgets. Cost is independent of how many expenses exist.
 */
export function useExpenseStatsAll(userId: string | null) {
  const [combined, setCombined] = useState<CombinedExpenseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    setError(false);

    const ref = collection(db, 'users', userId, 'expense_stats');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        let totalSpent = 0;
        let count = 0;
        const categories: Record<string, CategoryAggregate> = {};
        const perFund: Record<string, { totalSpent: number; count: number }> = {};

        for (const d of snap.docs) {
          const data = d.data();
          const fundSpent = data.totalSpent ?? 0;
          const fundCount = data.count ?? 0;
          totalSpent += fundSpent;
          count += fundCount;
          perFund[d.id as FundType] = { totalSpent: fundSpent, count: fundCount };

          for (const [name, agg] of Object.entries((data.categories ?? {}) as Record<string, CategoryAggregate>)) {
            const existing = categories[name] ?? { total: 0, count: 0 };
            categories[name] = { total: existing.total + agg.total, count: existing.count + agg.count };
          }
        }

        setCombined({ totalSpent, count, categories, perFund });
        setError(false);
        setLoading(false);
      },
      () => { setError(true); setLoading(false); }
    );
    return unsub;
  }, [userId]);

  return { combined, loading, error };
}
