'use server';

import { z } from 'zod';
import { adminDb } from '../firebase/admin';
import { requireUser } from '../auth/session';
import { createGoalSchema } from '../utils/validators';
import { FundType, Goal, GoalStatus } from '../types';
import { revalidatePath } from 'next/cache';

const setGoalStatusSchema = z.object({
  goalId: z.string().min(1),
  status: z.enum(['active', 'completed', 'paused']),
});

export async function createGoal(rawData: unknown) {
  const { ownerId: userId } = await requireUser();

  const parsed = createGoalSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }

  const { title, description, targetAmount, fundType, deadline, priority } = parsed.data;
  const now = new Date().toISOString();
  const userRef = adminDb.collection('users').doc(userId);
  const goalRef = userRef.collection('goals').doc();
  const goalId = goalRef.id;

  const batch = adminDb.batch();

  batch.set(goalRef, {
    id: goalId,
    userId,
    title,
    description,
    targetAmount,
    fundType: fundType as FundType,
    deadline,
    priority,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  } satisfies Goal);

  const auditRef = userRef.collection('audit_logs').doc();
  batch.set(auditRef, {
    id: auditRef.id,
    userId,
    action: 'goal_created',
    entityType: 'goal',
    entityId: goalId,
    after: { title, targetAmount, fundType, deadline, priority },
    createdAt: now,
  });

  await batch.commit();

  revalidatePath('/goals');
  return { success: true, goalId };
}

/**
 * Marks a goal completed/active/paused. Goals move no money (progress is derived from the linked
 * fund balance), so this is a pure status change — no balances, no transactions.
 */
export async function setGoalStatus(rawData: unknown) {
  const { ownerId: userId } = await requireUser();

  const parsed = setGoalStatusSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: 'Invalid request' };
  }
  const { goalId, status } = parsed.data;

  const userRef = adminDb.collection('users').doc(userId);
  const goalRef = userRef.collection('goals').doc(goalId);
  const snap = await goalRef.get();
  if (!snap.exists) {
    return { success: false, error: 'Goal not found' };
  }

  const now = new Date().toISOString();
  const before = (snap.data() as Goal).status;

  const batch = adminDb.batch();
  batch.update(goalRef, { status: status as GoalStatus, updatedAt: now });

  const auditRef = userRef.collection('audit_logs').doc();
  batch.set(auditRef, {
    id: auditRef.id,
    userId,
    action: 'goal_status_changed',
    entityType: 'goal',
    entityId: goalId,
    before: { status: before },
    after: { status },
    createdAt: now,
  });

  await batch.commit();

  revalidatePath('/goals');
  revalidatePath(`/goals/${goalId}`);
  return { success: true };
}
