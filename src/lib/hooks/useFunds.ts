'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  onSnapshot,
  doc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Fund, FundType } from '../types';

const FUND_IDS: FundType[] = ['stability', 'growth', 'life', 'charity'];

export function useFunds(userId: string | null) {
  const [funds, setFunds] = useState<Record<FundType, Fund> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const unsubscribers = FUND_IDS.map((fundId) =>
      onSnapshot(doc(db, 'users', userId, 'funds', fundId), (snap) => {
        if (snap.exists()) {
          setFunds((prev) => ({
            ...(prev ?? ({} as Record<FundType, Fund>)),
            [fundId]: snap.data() as Fund,
          }));
        }
        setLoading(false);
      })
    );

    return () => unsubscribers.forEach((u) => u());
  }, [userId]);

  const totalBalance = funds
    ? Object.values(funds).reduce((s, f) => s + f.balance, 0)
    : 0;
  const totalReceived = funds
    ? Object.values(funds).reduce((s, f) => s + f.totalReceived, 0)
    : 0;
  const totalSpent = funds
    ? Object.values(funds).reduce((s, f) => s + f.totalSpent, 0)
    : 0;

  return { funds, loading, totalBalance, totalReceived, totalSpent };
}
