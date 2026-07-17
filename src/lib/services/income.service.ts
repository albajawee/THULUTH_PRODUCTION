'use server';

import { adminDb } from '../firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { distributeIncome } from '../utils/calculations';
import { addIncomeSchema } from '../utils/validators';
import { FundType, Income } from '../types';
import { revalidatePath } from 'next/cache';

export async function addIncome(userId: string, rawData: unknown) {
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
