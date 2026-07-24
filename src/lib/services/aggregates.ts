import 'server-only';
import { FieldValue, WriteBatch, DocumentReference } from 'firebase-admin/firestore';

/**
 * Adds the monthly-aggregate update to an existing write batch.
 *
 * Deliberately NOT a `'use server'` action — it takes a already-verified userRef and mutates a
 * caller-owned batch, so it can never be invoked directly from the client. The income / expense /
 * donation actions call it inside the same batch that records the entry, which keeps the rollup
 * atomic with its cause.
 *
 * `month` is derived from the entry's own `date` (YYYY-MM), so a backdated entry lands in the
 * month it belongs to. Increments may be negative (reversals). Nested increments under set-merge
 * create the doc and the month key from absent.
 */
export function bumpMonthlyAggregate(
  batch: WriteBatch,
  userRef: DocumentReference,
  dateISO: string,
  delta: { income?: number; spending?: number },
  now: string
): void {
  const month = dateISO.slice(0, 7); // 'YYYY-MM'
  const bucket: Record<string, FirebaseFirestore.FieldValue> = {};
  if (delta.income !== undefined) bucket.income = FieldValue.increment(delta.income);
  if (delta.spending !== undefined) bucket.spending = FieldValue.increment(delta.spending);

  batch.set(
    userRef.collection('aggregates').doc('monthly'),
    { months: { [month]: bucket }, updatedAt: now },
    { merge: true }
  );
}
