'use server';

import { adminDb } from '../firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { createTransferSchema } from '../utils/validators';
import { Transfer } from '../types';
import { revalidatePath } from 'next/cache';

export async function transferFunds(userId: string, rawData: unknown) {
  const parsed = createTransferSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }

  const { fromFund, toFund, amount, reason } = parsed.data;
  const now = new Date().toISOString();
  const userRef = adminDb.collection('users').doc(userId);

  // Verify source fund has enough balance
  const fundSnap = await userRef.collection('funds').doc(fromFund).get();
  const fundBalance = (fundSnap.data()?.balance ?? 0) as number;
  if (fundBalance < amount) {
    return { success: false, error: { amount: [`Insufficient ${fromFund} fund balance`] } };
  }

  const batch = adminDb.batch();
  const transferRef = userRef.collection('transfers').doc();
  const transferId = transferRef.id;

  // 1. Write transfer document
  batch.set(transferRef, {
    id: transferId,
    userId,
    fromFund,
    toFund,
    amount,
    reason,
    createdAt: now,
  } satisfies Transfer);

  // 2. Decrement source fund
  batch.set(
    userRef.collection('funds').doc(fromFund),
    {
      id: fromFund,
      balance: FieldValue.increment(-amount),
      totalSpent: FieldValue.increment(amount),
      totalReceived: FieldValue.increment(0),
      updatedAt: now,
    },
    { merge: true }
  );

  // 3. Increment destination fund
  batch.set(
    userRef.collection('funds').doc(toFund),
    {
      id: toFund,
      balance: FieldValue.increment(amount),
      totalReceived: FieldValue.increment(amount),
      totalSpent: FieldValue.increment(0),
      updatedAt: now,
    },
    { merge: true }
  );

  // 4. Two transaction records
  const txOutRef = userRef.collection('transactions').doc();
  batch.set(txOutRef, {
    id: txOutRef.id,
    userId,
    type: 'transfer_out',
    fundType: fromFund,
    amount: -amount,
    description: `Transfer to ${toFund}: ${reason}`,
    relatedId: transferId,
    relatedType: 'transfer',
    createdAt: now,
  });

  const txInRef = userRef.collection('transactions').doc();
  batch.set(txInRef, {
    id: txInRef.id,
    userId,
    type: 'transfer_in',
    fundType: toFund,
    amount,
    description: `Transfer from ${fromFund}: ${reason}`,
    relatedId: transferId,
    relatedType: 'transfer',
    createdAt: now,
  });

  // 5. Audit log
  const auditRef = userRef.collection('audit_logs').doc();
  batch.set(auditRef, {
    id: auditRef.id,
    userId,
    action: 'transfer_created',
    entityType: 'transfer',
    entityId: transferId,
    after: { fromFund, toFund, amount, reason },
    createdAt: now,
  });

  await batch.commit();

  revalidatePath('/transfers');
  revalidatePath('/dashboard');
  revalidatePath(`/funds/${fromFund}`);
  revalidatePath(`/funds/${toFund}`);

  return { success: true, transferId };
}
