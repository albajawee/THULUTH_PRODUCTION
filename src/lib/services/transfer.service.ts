'use server';

import { z } from 'zod';
import { adminDb } from '../firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { requireUser } from '../auth/session';
import { createTransferSchema } from '../utils/validators';
import { Transfer } from '../types';
import { revalidatePath } from 'next/cache';

export async function transferFunds(rawData: unknown) {
  const { ownerId: userId } = await requireUser();

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

const reverseTransferSchema = z.object({ transferId: z.string().min(1) });

/**
 * Undoes a transfer: money goes back from the destination fund to the source fund.
 *
 * Reversal model: the transfer is removed from the working list and both funds are restored, while
 * the immutable ledger keeps the original in/out rows and gains two reversal rows (one per fund).
 *
 * Guard: undoing pulls the amount back OUT of the destination fund. If that money has since been
 * spent, the destination can't give it back, so we refuse rather than drive a fund negative —
 * mirroring the source-balance check the original transfer makes.
 */
export async function reverseTransfer(rawData: unknown) {
  const { ownerId: userId } = await requireUser();

  const parsed = reverseTransferSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: 'Invalid request' };
  }
  const { transferId } = parsed.data;

  const userRef = adminDb.collection('users').doc(userId);
  const transferRef = userRef.collection('transfers').doc(transferId);
  const snap = await transferRef.get();
  if (!snap.exists) {
    return { success: false, error: 'Transfer not found' };
  }
  const transfer = snap.data() as Transfer;
  const { fromFund, toFund, amount, reason } = transfer;

  // The destination fund must still hold at least the transferred amount to give it back.
  const toSnap = await userRef.collection('funds').doc(toFund).get();
  const toBalance = (toSnap.data()?.balance ?? 0) as number;
  if (toBalance < amount) {
    return {
      success: false,
      error: `Can't undo — the ${toFund} fund no longer has ${amount} to return. It was spent after the transfer.`,
    };
  }

  const now = new Date().toISOString();
  const batch = adminDb.batch();

  // Remove from the working list.
  batch.delete(transferRef);

  // Undo destination: take the amount back out.
  batch.set(
    userRef.collection('funds').doc(toFund),
    {
      id: toFund,
      balance: FieldValue.increment(-amount),
      totalReceived: FieldValue.increment(-amount),
      totalSpent: FieldValue.increment(0),
      updatedAt: now,
    },
    { merge: true }
  );

  // Undo source: give the amount back.
  batch.set(
    userRef.collection('funds').doc(fromFund),
    {
      id: fromFund,
      balance: FieldValue.increment(amount),
      totalSpent: FieldValue.increment(-amount),
      totalReceived: FieldValue.increment(0),
      updatedAt: now,
    },
    { merge: true }
  );

  // Two reversal ledger rows, mirroring the original transfer_out / transfer_in pair.
  const revOutRef = userRef.collection('transactions').doc();
  batch.set(revOutRef, {
    id: revOutRef.id,
    userId,
    type: 'reversal',
    fundType: toFund,
    amount: -amount, // leaving the destination
    description: `Reversed transfer to ${toFund}: ${reason}`,
    relatedId: transferId,
    relatedType: 'transfer',
    createdAt: now,
  });

  const revInRef = userRef.collection('transactions').doc();
  batch.set(revInRef, {
    id: revInRef.id,
    userId,
    type: 'reversal',
    fundType: fromFund,
    amount, // returning to the source
    description: `Reversed transfer from ${fromFund}: ${reason}`,
    relatedId: transferId,
    relatedType: 'transfer',
    createdAt: now,
  });

  const auditRef = userRef.collection('audit_logs').doc();
  batch.set(auditRef, {
    id: auditRef.id,
    userId,
    action: 'transfer_reversed',
    entityType: 'transfer',
    entityId: transferId,
    before: { fromFund, toFund, amount, reason },
    createdAt: now,
  });

  await batch.commit();

  revalidatePath('/transfers');
  revalidatePath('/dashboard');
  revalidatePath(`/funds/${fromFund}`);
  revalidatePath(`/funds/${toFund}`);

  return { success: true };
}
