'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Expense, FundType } from '../types';

/**
 * Paginated, realtime expense feed.
 *
 * Pagination is a single growing-window listener rather than cursor hopping: the query always
 * fetches `pageSize * pagesLoaded + 1` most-recent expenses, and `loadMore` bumps `pagesLoaded`.
 * The `+ 1` is a probe — if it comes back, there is at least one more expense than we are showing,
 * so `hasMore` is true and we slice it off. This keeps ONE onSnapshot alive (new and reversed
 * expenses still update live at the top) while reads stay bounded by what the user actually chose
 * to view, instead of the whole collection.
 */
export function useExpenses(userId: string | null, fundType?: FundType, pageSize = 20) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pagesLoaded, setPagesLoaded] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [indexBuilding, setIndexBuilding] = useState(false);

  // A different user or fund is a different list — start again from the first page.
  useEffect(() => {
    setPagesLoaded(1);
    setLoading(true);
  }, [userId, fundType]);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    const windowSize = pageSize * pagesLoaded;
    const constraints: Parameters<typeof query>[1][] = [
      orderBy('createdAt', 'desc'),
      limit(windowSize + 1),
    ];
    if (fundType) constraints.unshift(where('fundType', '==', fundType));

    const q = query(collection(db, 'users', userId, 'expenses'), ...constraints);

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense));
      setHasMore(docs.length > windowSize);
      setExpenses(docs.slice(0, windowSize));
      setIndexBuilding(false);
      setLoading(false);
      setLoadingMore(false);
    }, (err) => {
      if (err.code === 'failed-precondition') {
        setIndexBuilding(true);
      }
      setLoading(false);
      setLoadingMore(false);
    });

    return unsub;
  }, [userId, fundType, pageSize, pagesLoaded]);

  const loadMore = useCallback(() => {
    setLoadingMore(true);
    setPagesLoaded((n) => n + 1);
  }, []);

  return { expenses, loading, loadingMore, hasMore, loadMore, indexBuilding };
}
