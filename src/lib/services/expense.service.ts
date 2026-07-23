'use server';

import { z } from 'zod';
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
    // Description is optional; the category is the only always-present label, and a transaction
    // ledger with blank rows is unreadable.
    description: description || category,
    relatedId: expenseId,
    relatedType: 'expense',
    createdAt: now,
  });

  // 4. Roll up the per-fund expense aggregate that powers the analytics view. Same batch, so the
  //    rollup can never drift from the expense that caused it. Nested increments under a set-merge
  //    apply at any depth; the category label is a literal map key (dots in it are safe here —
  //    merge treats object keys as field names, not dot-paths).
  batch.set(
    userRef.collection('expense_stats').doc(fundType),
    {
      fundType,
      totalSpent: FieldValue.increment(amount),
      count: FieldValue.increment(1),
      categories: {
        [category]: { total: FieldValue.increment(amount), count: FieldValue.increment(1) },
      },
      updatedAt: now,
    },
    { merge: true }
  );

  // 5. Audit log
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

const reverseExpenseSchema = z.object({ expenseId: z.string().min(1) });

/**
 * Reverses an expense entered by mistake.
 *
 * The reversal model (SAAS_PLAN.md): the expense is removed from the working list and the money is
 * returned to its fund, but the immutable `transactions` ledger keeps the original expense row AND
 * gains a matching `+amount` reversal row. Net ledger effect is zero, so balances always reconcile
 * against the ledger, and the audit log records what happened. The original charge is never
 * silently rewritten.
 */
export async function reverseExpense(rawData: unknown) {
  const { ownerId: userId } = await requireUser();

  const parsed = reverseExpenseSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: 'Invalid request' };
  }
  const { expenseId } = parsed.data;

  const userRef = adminDb.collection('users').doc(userId);
  const expenseRef = userRef.collection('expenses').doc(expenseId);
  const snap = await expenseRef.get();
  if (!snap.exists) {
    return { success: false, error: 'Expense not found' };
  }
  const expense = snap.data() as Expense;
  const now = new Date().toISOString();

  const batch = adminDb.batch();

  // Remove from the working list (the transactions ledger keeps the full history).
  batch.delete(expenseRef);

  // Give the money back: undo the original decrement.
  batch.set(
    userRef.collection('funds').doc(expense.fundType),
    {
      id: expense.fundType,
      balance: FieldValue.increment(expense.amount),
      totalSpent: FieldValue.increment(-expense.amount),
      totalReceived: FieldValue.increment(0),
      updatedAt: now,
    },
    { merge: true }
  );

  // Undo the analytics rollup too, mirroring addExpense exactly. Uses the category stored ON the
  // expense, which category renames keep current — so this always decrements the right bucket.
  batch.set(
    userRef.collection('expense_stats').doc(expense.fundType),
    {
      fundType: expense.fundType,
      totalSpent: FieldValue.increment(-expense.amount),
      count: FieldValue.increment(-1),
      categories: {
        [expense.category]: {
          total: FieldValue.increment(-expense.amount),
          count: FieldValue.increment(-1),
        },
      },
      updatedAt: now,
    },
    { merge: true }
  );

  // Append the reversal to the immutable ledger (original expense row is left intact).
  const txRef = userRef.collection('transactions').doc();
  batch.set(txRef, {
    id: txRef.id,
    userId,
    type: 'reversal',
    fundType: expense.fundType,
    amount: expense.amount, // positive: money returning to the fund
    description: `Reversed expense: ${expense.description}`,
    relatedId: expenseId,
    relatedType: 'expense',
    createdAt: now,
  });

  const auditRef = userRef.collection('audit_logs').doc();
  batch.set(auditRef, {
    id: auditRef.id,
    userId,
    action: 'expense_reversed',
    entityType: 'expense',
    entityId: expenseId,
    before: {
      fundType: expense.fundType,
      category: expense.category,
      amount: expense.amount,
      description: expense.description,
      date: expense.date,
    },
    createdAt: now,
  });

  await batch.commit();

  revalidatePath('/dashboard');
  revalidatePath(`/funds/${expense.fundType}`);

  return { success: true };
}
