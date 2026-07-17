'use server';

import { adminDb } from '../firebase/admin';
import { requireUser } from '../auth/session';
import { createGoalSchema } from '../utils/validators';
import { FundType, Goal } from '../types';
import { revalidatePath } from 'next/cache';

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
