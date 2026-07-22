'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Lifetime sum of every transfer still on the books.
 *
 * Exists to undo a double-count. A transfer between funds increments the *source* fund's
 * `totalSpent` and the *destination* fund's `totalReceived` (see services/transfer.service.ts),
 * which is correct at the fund level — money really did leave one and enter the other. But summing
 * those counters across all four funds, as the dashboard does for its account-level headline
 * figures, then counts each internal move as both income and an expense. Subtracting this total
 * removes exactly that inflation.
 *
 * Deliberately unbounded, unlike the paginated `useTransfers`: a partial sum would under-correct
 * and produce a subtly wrong number, which is worse than the bug it fixes. Transfers are rare
 * enough in a personal-finance account for this to stay cheap.
 *
 * Reversed transfers need no special handling — reverseTransfer deletes the transfer document and
 * backs the same amounts out of both funds, so the collection and the counters stay in step.
 */
export function useTransferTotal(userId: string | null) {
  const [totalTransferred, setTotalTransferred] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    const unsub = onSnapshot(
      collection(db, 'users', userId, 'transfers'),
      (snap) => {
        setTotalTransferred(
          snap.docs.reduce((sum, d) => sum + ((d.data().amount as number) ?? 0), 0)
        );
        setLoading(false);
      },
      () => setLoading(false)
    );

    return unsub;
  }, [userId]);

  return { totalTransferred, loading };
}
