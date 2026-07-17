'use server';

import { adminDb } from '../firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { requireUser } from '../auth/session';
import { addExpenseSchema } from '../utils/validators';
import { Expense, FundType } from '../types';
import { revalidatePath } from 'next/cache';

export async function addExpense(rawData: unknown) {
  const { ownerId: userId } = await requireUser();

  const parsed = addExpenseSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }

  const { fundType, category, amount, description, date } = parsed.data;
  const now = new Date().toISOString();
  const userRef = adminDb.collection('users').doc(userId);
  const expenseRef = userRef.collection('expenses').doc();
  const expenseId = expenseRef.id;

  const batch = adminDb.batch();

  // 1. Write expense document
  batch.set(expenseRef, {
    id: expenseId,
    userId,
    fundType: fundType as FundType,
    category: category as Expense['category'],
    amount,
    description,
    date,
    createdAt: now,
  } satisfies Expense);

  // 2. Decrement fund balance
  batch.set(
    userRef.collection('funds').doc(fundType),
    {
      id: fundType,
      balance: FieldValue.increment(-amount),
      totalSpent: FieldValue.increment(amount),
      totalReceived: FieldValue.increment(0),
      updatedAt: now,
    },
    { merge: true }
  );

  // 3. Create transaction record
  const txRef = userRef.collection('transactions').doc();
  batch.set(txRef, {
    id: txRef.id,
    userId,
    type: 'expense',
    fundType: fundType as FundType,
    amount: -amount,
    description,
    relatedId: expenseId,
    relatedType: 'expense',
    createdAt: now,
  });

  // 4. Audit log
  const auditRef = userRef.collection('audit_logs').doc();
  batch.set(auditRef, {
    id: auditRef.id,
    userId,
    action: 'expense_added',
    entityType: 'expense',
    entityId: expenseId,
    after: { fundType, category, amount, description, date },
    createdAt: now,
  });

  await batch.commit();

  revalidatePath('/dashboard');
  revalidatePath(`/funds/${fundType}`);

  return { success: true, expenseId };
}
