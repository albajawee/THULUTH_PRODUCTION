'use server';

import { adminDb } from '../firebase/admin';
import { FundType, UserProfile } from '../types';
import { updateUserSettingsSchema } from '../utils/validators';
import { revalidatePath } from 'next/cache';

const FUND_TYPES: FundType[] = ['stability', 'growth', 'life', 'charity'];

export async function initFunds(userId: string): Promise<void> {
  const now = new Date().toISOString();
  const userRef = adminDb.collection('users').doc(userId);
  const batch = adminDb.batch();

  for (const fund of FUND_TYPES) {
    const fundRef = userRef.collection('funds').doc(fund);
    const snap = await fundRef.get();
    if (!snap.exists) {
      batch.set(fundRef, {
        id: fund,
        balance: 0,
        totalReceived: 0,
        totalSpent: 0,
        updatedAt: now,
      });
    }
  }

  const auditRef = userRef.collection('audit_logs').doc();
  batch.set(auditRef, {
    id: auditRef.id,
    userId,
    action: 'funds_initialized',
    entityType: 'fund',
    entityId: userId,
    createdAt: now,
  });

  await batch.commit();
}

export async function createUserProfile(
  uid: string,
  displayName: string,
  email: string
): Promise<void> {
  const now = new Date().toISOString();
  const userRef = adminDb.collection('users').doc(uid);
  const snap = await userRef.get();
  if (!snap.exists) {
    await userRef.set({
      uid,
      displayName,
      email,
      selectedCurrency: 'SAR',
      selectedLanguage: 'en',
      createdAt: now,
      updatedAt: now,
    } satisfies UserProfile);
    await initFunds(uid);
  }
}

export async function updateUserSettings(userId: string, rawData: unknown) {
  const parsed = updateUserSettingsSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }

  const now = new Date().toISOString();
  await adminDb.collection('users').doc(userId).set(
    { ...parsed.data, updatedAt: now },
    { merge: true }
  );

  revalidatePath('/settings');
  return { success: true };
}
