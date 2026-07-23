'use server';

import { cookies } from 'next/headers';
import { FieldValue, FieldPath } from 'firebase-admin/firestore';
import { adminDb } from '../firebase/admin';
import { requireUser } from '../auth/session';
import {
  updateUserSettingsSchema,
  updateFundCategoriesSchema,
  renameFundCategorySchema,
} from '../utils/validators';
import { categoriesForFund } from '../constants/fund-categories';
import { FundType } from '../types';
import { revalidatePath } from 'next/cache';

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Firestore caps a batch at 500 writes; stay under it with room for the audit entry. */
const RENAME_BATCH_SIZE = 400;

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

  // Mirror preferences into cookies the server can read on the next request, so the first paint
  // already reflects them (no flash). `locale` also drives the RTL direction in the root layout.
  const jar = await cookies();
  if (parsed.data.selectedCurrency) {
    jar.set('currency', parsed.data.selectedCurrency, { path: '/', maxAge: ONE_YEAR, sameSite: 'lax' });
  }
  if (parsed.data.selectedLanguage) {
    jar.set('locale', parsed.data.selectedLanguage, { path: '/', maxAge: ONE_YEAR, sameSite: 'lax' });
  }

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

/**
 * Renames one category within a fund, carrying every expense already filed under it.
 *
 * A category has no id — the label on the expense IS the reference. So a rename is a data
 * migration, not a settings edit: rewrite the expenses first, then the list. That order matters.
 * If the expense pass fails we return before touching the list, leaving the account exactly as it
 * was and the rename safe to retry. The reverse order could leave expenses stranded under a label
 * the UI no longer offers, which is the outcome this whole function exists to prevent.
 *
 * Historical records are deliberately NOT rewritten: `transactions` descriptions and `audit_logs`
 * narrate what happened at the time, and editing them would falsify the ledger.
 */
export async function renameFundCategory(rawData: unknown) {
  const { ownerId } = await requireUser();

  const parsed = renameFundCategorySchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid rename' };
  }
  const { fundType, from, to } = parsed.data;

  // Nothing to do — not an error, so the UI can close the editor cleanly.
  if (from === to) return { success: true as const, updated: 0 };

  const userRef = adminDb.collection('users').doc(ownerId);
  const snap = await userRef.get();
  const stored = snap.data()?.categories as Partial<Record<FundType, string[]>> | undefined;

  // Falls back to the seed defaults, so a user who never customised this fund can still rename.
  const current = categoriesForFund(stored, fundType);

  const index = current.indexOf(from);
  if (index === -1) {
    return { success: false as const, error: `"${from}" is no longer in this fund` };
  }

  // Case-insensitive, ignoring the entry being renamed — so fixing only the casing of a category
  // ("gifts" -> "Gifts") is allowed, while colliding with a different one is not. Merging two
  // categories is a different operation with different consequences; it is not offered here.
  const collides = current.some((c, i) => i !== index && c.toLowerCase() === to.toLowerCase());
  if (collides) {
    return { success: false as const, error: `"${to}" already exists in this fund` };
  }

  // 1. Migrate the expenses that reference the old label.
  const matching = await userRef
    .collection('expenses')
    .where('fundType', '==', fundType)
    .where('category', '==', from)
    .get();

  for (let i = 0; i < matching.docs.length; i += RENAME_BATCH_SIZE) {
    const batch = adminDb.batch();
    for (const doc of matching.docs.slice(i, i + RENAME_BATCH_SIZE)) {
      batch.update(doc.ref, { category: to });
    }
    await batch.commit();
  }

  // 2. Move the analytics aggregate from the old label to the new one. Totals don't change — the
  //    same expenses, the same amounts — only the bucket they're attributed to. `from`'s sums are
  //    added onto `to` (which may already exist if this is a case-fix merge onto itself — it
  //    can't, collisions are rejected above, so `to` is always new here), then the `from` key is
  //    removed. If the stats doc doesn't exist yet (pre-backfill), the delete is a no-op and the
  //    backfill will build the correct map from scratch.
  const movedTotal = matching.docs.reduce((s, d) => s + ((d.data().amount as number) ?? 0), 0);
  const statsRef = userRef.collection('expense_stats').doc(fundType);
  if (matching.size > 0) {
    await statsRef.set(
      {
        categories: { [to]: { total: FieldValue.increment(movedTotal), count: FieldValue.increment(matching.size) } },
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  }
  await statsRef
    .update(new FieldPath('categories', from), FieldValue.delete())
    .catch(() => {/* stats doc not created yet — backfill will populate it */});

  // 3. Only now update the list, keeping the category in its existing position.
  const next = [...current];
  next[index] = to;

  const now = new Date().toISOString();
  await userRef.set({ categories: { [fundType]: next }, updatedAt: now }, { merge: true });

  const auditRef = userRef.collection('audit_logs').doc();
  await auditRef.set({
    id: auditRef.id,
    userId: ownerId,
    action: 'category_renamed',
    entityType: 'category',
    entityId: `${fundType}:${to}`,
    before: { fundType, category: from },
    after: { fundType, category: to, expensesUpdated: matching.size },
    createdAt: now,
  });

  revalidatePath('/settings');
  revalidatePath('/dashboard');
  revalidatePath('/reports');
  revalidatePath(`/funds/${fundType}`);

  return { success: true as const, updated: matching.size };
}
