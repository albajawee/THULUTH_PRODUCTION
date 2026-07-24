'use server';

import { z } from 'zod';
import { adminDb } from '../firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { requireUser } from '../auth/session';
import { addDonationSchema } from '../utils/validators';
import { bumpMonthlyAggregate } from './aggregates';
import { Donation } from '../types';
import { revalidatePath } from 'next/cache';

export async function recordDonation(rawData: unknown) {
  const { ownerId: userId } = await requireUser();

  const parsed = addDonationSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }

  const { amount, recipient, category, description, date } = parsed.data;
  const now = new Date().toISOString();
  const userRef = adminDb.collection('users').doc(userId);

  // Verify charity fund has enough balance
  const fundSnap = await userRef.collection('funds').doc('charity').get();
  const fundBalance = (fundSnap.data()?.balance ?? 0) as number;
  if (fundBalance < amount) {
    return { success: false, error: { amount: ['Insufficient Charity Fund balance'] } };
  }

  const batch = adminDb.batch();
  const donationRef = userRef.collection('donations').doc();
  const donationId = donationRef.id;

  // 1. Write donation document
  batch.set(donationRef, {
    id: donationId,
    userId,
    amount,
    recipient,
    category,
    description,
    date,
    createdAt: now,
  } satisfies Donation);

  // 2. Decrement charity fund
  batch.set(
    userRef.collection('funds').doc('charity'),
    {
      id: 'charity',
      balance: FieldValue.increment(-amount),
      totalSpent: FieldValue.increment(amount),
      totalReceived: FieldValue.increment(0),
      updatedAt: now,
    },
    { merge: true }
  );

  // 3. Transaction record
  const txRef = userRef.collection('transactions').doc();
  batch.set(txRef, {
    id: txRef.id,
    userId,
    type: 'donation',
    fundType: 'charity',
    amount: -amount,
    description: `Donation to: ${recipient}`,
    relatedId: donationId,
    relatedType: 'donation',
    createdAt: now,
  });

  // 4. Monthly rollup — a donation is money out, bucketed by its own date.
  bumpMonthlyAggregate(batch, userRef, date, { spending: amount }, now);

  // 5. Audit log
  const auditRef = userRef.collection('audit_logs').doc();
  batch.set(auditRef, {
    id: auditRef.id,
    userId,
    action: 'donation_recorded',
    entityType: 'donation',
    entityId: donationId,
    after: { amount, recipient, category, description, date },
    createdAt: now,
  });

  await batch.commit();

  revalidatePath('/funds/charity');
  revalidatePath('/dashboard');

  return { success: true, donationId };
}

const reverseDonationSchema = z.object({ donationId: z.string().min(1) });

/**
 * Reverses a donation: the amount is returned to the charity fund. Reversal model — donation leaves
 * the working list, the immutable ledger keeps the original donation row and gains a +amount
 * reversal row, and the audit log records it.
 */
export async function reverseDonation(rawData: unknown) {
  const { ownerId: userId } = await requireUser();

  const parsed = reverseDonationSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: 'Invalid request' };
  }
  const { donationId } = parsed.data;

  const userRef = adminDb.collection('users').doc(userId);
  const donationRef = userRef.collection('donations').doc(donationId);
  const snap = await donationRef.get();
  if (!snap.exists) {
    return { success: false, error: 'Donation not found' };
  }
  const donation = snap.data() as Donation;
  const now = new Date().toISOString();

  const batch = adminDb.batch();

  batch.delete(donationRef);

  // Give the money back to the charity fund.
  batch.set(
    userRef.collection('funds').doc('charity'),
    {
      id: 'charity',
      balance: FieldValue.increment(donation.amount),
      totalSpent: FieldValue.increment(-donation.amount),
      totalReceived: FieldValue.increment(0),
      updatedAt: now,
    },
    { merge: true }
  );

  // Undo the monthly rollup, mirroring recordDonation.
  bumpMonthlyAggregate(batch, userRef, donation.date, { spending: -donation.amount }, now);

  const txRef = userRef.collection('transactions').doc();
  batch.set(txRef, {
    id: txRef.id,
    userId,
    type: 'reversal',
    fundType: 'charity',
    amount: donation.amount, // returning to the fund
    description: `Reversed donation to: ${donation.recipient}`,
    relatedId: donationId,
    relatedType: 'donation',
    createdAt: now,
  });

  const auditRef = userRef.collection('audit_logs').doc();
  batch.set(auditRef, {
    id: auditRef.id,
    userId,
    action: 'donation_reversed',
    entityType: 'donation',
    entityId: donationId,
    before: {
      amount: donation.amount,
      recipient: donation.recipient,
      description: donation.description,
      date: donation.date,
    },
    createdAt: now,
  });

  await batch.commit();

  revalidatePath('/funds/charity');
  revalidatePath('/dashboard');

  return { success: true };
}
