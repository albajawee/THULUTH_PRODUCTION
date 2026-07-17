'use server';

import { adminDb } from '../firebase/admin';
import { requireUser } from '../auth/session';
import { updateUserSettingsSchema, updateFundCategoriesSchema } from '../utils/validators';
import { revalidatePath } from 'next/cache';

/**
 * Note: `initFunds` and `createUserProfile` used to live here as server actions taking a uid from
 * the client. Both now run server-side on session creation (see `app/api/session/route.ts` ->
 * `services/bootstrap.ts`), because a client should never be able to name the account it is
 * bootstrapping.
 */

export async function updateUserSettings(rawData: unknown) {
  const { ownerId } = await requireUser();

  const parsed = updateUserSettingsSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }

  const now = new Date().toISOString();
  await adminDb.collection('users').doc(ownerId).set(
    { ...parsed.data, updatedAt: now },
    { merge: true }
  );

  revalidatePath('/settings');
  return { success: true };
}

/**
 * Replaces the expense-category list for one fund. Categories are stored on the user doc under
 * `categories.<fundType>`; other funds are left untouched (dot-path merge). Reordering, adds, and
 * removes all come through here as the new full list for that fund.
 */
export async function updateFundCategories(rawData: unknown) {
  const { ownerId } = await requireUser();

  const parsed = updateFundCategoriesSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid categories' };
  }
  const { fundType, categories } = parsed.data;

  await adminDb.collection('users').doc(ownerId).set(
    { categories: { [fundType]: categories }, updatedAt: new Date().toISOString() },
    { merge: true }
  );

  revalidatePath('/settings');
  return { success: true };
}
