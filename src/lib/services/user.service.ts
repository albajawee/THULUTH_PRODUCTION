'use server';

import { adminDb } from '../firebase/admin';
import { requireUser } from '../auth/session';
import { updateUserSettingsSchema } from '../utils/validators';
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
