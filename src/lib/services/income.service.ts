'use server';

import { z } from 'zod';
import { adminDb } from '../firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { requireUser } from '../auth/session';
import { distributeIncome } from '../utils/calculations';
import { addIncomeSchema } from '../utils/validators';
import { FundType, Income } from '../types';
import { revalidatePath } from 'next/cache';

const FUNDS: FundType[] = ['stability', 'growth', 'life', 'charity'];

export async function addIncome(rawData: unknown) {
  const { ownerId: userId } = await requireUser();

  const parsed = addIncomeSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }

  const { amount, source, date, note } = parsed.data;
  const distributions = distributeIncome(amount);
  const now = new Date().toISOString();
  const incomeId = adminDb.collection('users').doc(userId).collection('incomes').doc().id;

  const batch = adminDb.batch();
  const userRef = adminDb.collection('users').doc(userId);

  // 1. Write income document
  const incomeRef = userRef.collection('incomes').doc(incomeId);
  batch.set(incomeRef, {
    id: incomeId,
    userId,
    amount,
    source,
    date,
    note: note ?? undefined,
    distributions,
    createdAt: now,
  } satisfies Income);

  // 2. Update 4 fund balances (set+merge so it works even if doc is missing)
  const funds: FundType[] = ['stability', 'growth', 'life', 'charity'];
  for (const fund of funds) {
    const fundRef = userRef.collection('funds').doc(fund);
    batch.set(
      fundRef,
      {
        id: fund,
        balance: FieldValue.increment(distributions[fund]),
        totalReceived: FieldValue.increment(distributions[fund]),
        totalSpent: FieldValue.increment(0),
        updatedAt: now,
      },
      { merge: true }
    );
  }

  // 3. Create 4 transaction records
  for (const fund of funds) {
    const txRef = userRef.collection('transactions').doc();
    batch.set(txRef, {
      id: txRef.id,
      userId,
      type: 'income_distribution',
      fundType: fund,
      amount: distributions[fund],
      description: `Income distribution from: ${source}`,
      relatedId: incomeId,
      relatedType: 'income',
      createdAt: now,
    });
  }

  // 4. Audit log
  const auditRef = userRef.collection('audit_logs').doc();
  batch.set(auditRef, {
    id: auditRef.id,
    userId,
    action: 'income_added',
    entityType: 'income',
    entityId: incomeId,
    after: { amount, source, date, distributions },
    createdAt: now,
  });

  await batch.commit();

  revalidatePath('/dashboard');
  revalidatePath('/income');

  return { success: true, incomeId };
}

const reverseIncomeSchema = z.object({ incomeId: z.string().min(1) });

/**
 * Reverses an income entry: the per-fund distribution is pulled back out of all four funds.
 *
 * Reversal model: the income leaves the working list and every fund is restored by its exact
 * original share, while the immutable ledger keeps the four original distribution rows and gains
 * four reversal rows.
 *
 * Guard: undoing removes each fund's share. Money already spent can't be un-received, so if any
 * fund now holds less than its original share we refuse rather than drive it negative. In practice
 * this only blocks reversing income you've already spent from — which is the correct outcome.
 */
export async function reverseIncome(rawData: unknown) {
  const { ownerId: userId } = await requireUser();

  const parsed = reverseIncomeSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: 'Invalid request' };
  }
  const { incomeId } = parsed.data;

  const userRef = adminDb.collection('users').doc(userId);
  const incomeRef = userRef.collection('incomes').doc(incomeId);
  const snap = await incomeRef.get();
  if (!snap.exists) {
    return { success: false, error: 'Income not found' };
  }
  const income = snap.data() as Income;
  const { distributions, source } = income;

  // Every fund must still hold at least the share this income put into it.
  const fundSnaps = await Promise.all(
    FUNDS.map((f) => userRef.collection('funds').doc(f).get())
  );
  for (let i = 0; i < FUNDS.length; i++) {
    const fund = FUNDS[i];
    const balance = (fundSnaps[i].data()?.balance ?? 0) as number;
    if (balance < distributions[fund]) {
      return {
        success: false,
        error: `Can't undo — the ${fund} fund no longer holds its ${distributions[fund]} share of this income. Some was already spent.`,
      };
    }
  }

  const now = new Date().toISOString();
  const batch = adminDb.batch();

  batch.delete(incomeRef);

  for (const fund of FUNDS) {
    const share = distributions[fund];

    batch.set(
      userRef.collection('funds').doc(fund),
      {
        id: fund,
        balance: FieldValue.increment(-share),
        totalReceived: FieldValue.increment(-share),
        totalSpent: FieldValue.increment(0),
        updatedAt: now,
      },
      { merge: true }
    );

    const txRef = userRef.collection('transactions').doc();
    batch.set(txRef, {
      id: txRef.id,
      userId,
      type: 'reversal',
      fundType: fund,
      amount: -share, // leaving the fund
      description: `Reversed income from: ${source}`,
      relatedId: incomeId,
      relatedType: 'income',
      createdAt: now,
    });
  }

  const auditRef = userRef.collection('audit_logs').doc();
  batch.set(auditRef, {
    id: auditRef.id,
    userId,
    action: 'income_reversed',
    entityType: 'income',
    entityId: incomeId,
    before: { amount: income.amount, source, distributions },
    createdAt: now,
  });

  await batch.commit();

  revalidatePath('/dashboard');
  revalidatePath('/income');

  return { success: true };
}
