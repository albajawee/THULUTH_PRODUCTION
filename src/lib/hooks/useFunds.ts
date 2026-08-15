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
      onSnapshot(
        doc(db, 'users', userId, 'funds', fundId),
        (snap) => {
          if (snap.exists()) {
            setFunds((prev) => ({
              ...(prev ?? ({} as Record<FundType, Fund>)),
              [fundId]: snap.data() as Fund,
            }));
          }
          setLoading(false);
        },
        // Without this the listener could fail and leave `loading` true forever, which the
        // dashboard renders as skeleton tiles that never resolve. Better to drop out of loading
        // and show the zero state than to spin with no way out.
        () => setLoading(false)
      )
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
  // Every transfer lands in exactly one fund's `transferredIn`, so this sums to the total moved
  // between funds — the amount account-level income must exclude. Reading it from the fund docs
  // means the dashboard still costs four document reads and never scans the transfers collection.
  const totalTransferredIn = funds
    ? Object.values(funds).reduce((s, f) => s + (f.transferredIn ?? 0), 0)
    : 0;
  // ROSCA payouts land in a fund's `totalReceived` like any other receipt, but they are not new
  // income — the money is the user's own contributions coming back round. Summed here so the
  // dashboard can subtract them, exactly as it does for transfers.
  const totalRoscaIn = funds
    ? Object.values(funds).reduce((s, f) => s + (f.roscaIn ?? 0), 0)
    : 0;
  const totalRoscaOut = funds
    ? Object.values(funds).reduce((s, f) => s + (f.roscaOut ?? 0), 0)
    : 0;

  return {
    funds, loading, totalBalance, totalReceived, totalSpent,
    totalTransferredIn, totalRoscaIn, totalRoscaOut,
  };
}
