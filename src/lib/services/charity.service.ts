'use server';

import { adminDb } from '../firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { requireUser } from '../auth/session';
import { addDonationSchema } from '../utils/validators';
import { Donation } from '../types';
import { revalidatePath } from 'next/cache';

export async function recordDonation(rawData: unknown) {
  const { ownerId: userId } = await requireUser();

  const parsed = addDonationSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }

  const { amount, recipient, description, date } = parsed.data;
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

  // 4. Audit log
  const auditRef = userRef.collection('audit_logs').doc();
  batch.set(auditRef, {
    id: auditRef.id,
    userId,
    action: 'donation_recorded',
    entityType: 'donation',
    entityId: donationId,
    after: { amount, recipient, description, date },
    createdAt: now,
  });

  await batch.commit();

  revalidatePath('/funds/charity');
  revalidatePath('/dashboard');

  return { success: true, donationId };
}
