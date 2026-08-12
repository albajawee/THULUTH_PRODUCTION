import 'server-only';
import { adminDb } from '../firebase/admin';
import { FundType, UserProfile } from '../types';
import { DEFAULT_CATEGORIES_BY_FUND } from '../constants/fund-categories';
import { DEFAULT_CURRENCY } from '../constants/currency';

/**
 * User/fund bootstrap.
 *
 * Deliberately NOT a `'use server'` module: every export of a `'use server'` file becomes a
 * publicly callable endpoint, and these functions take a uid argument. They must only ever be
 * called with a uid the server has already verified (i.e. from the session route, after
 * `verifyIdToken`). Keeping them out of the action boundary makes that structural.
 */

const FUND_TYPES: FundType[] = ['stability', 'growth', 'life', 'charity'];

/** Creates any missing fund docs. Idempotent — existing funds are left untouched. */
export async function initFundsFor(userId: string): Promise<void> {
  const now = new Date().toISOString();
  const userRef = adminDb.collection('users').doc(userId);

  const snaps = await Promise.all(
    FUND_TYPES.map((fund) => userRef.collection('funds').doc(fund).get())
  );

  const missing = FUND_TYPES.filter((_, i) => !snaps[i].exists);
  if (missing.length === 0) return;

  const batch = adminDb.batch();
  for (const fund of missing) {
    batch.set(userRef.collection('funds').doc(fund), {
      id: fund,
      balance: 0,
      totalReceived: 0,
      totalSpent: 0,
      transferredIn: 0,
      transferredOut: 0,
      updatedAt: now,
    });
  }

  const auditRef = userRef.collection('audit_logs').doc();
  batch.set(auditRef, {
    id: auditRef.id,
    userId,
    action: 'funds_initialized',
    entityType: 'fund',
    entityId: userId,
    after: { funds: missing },
    createdAt: now,
  });

  await batch.commit();
}

/**
 * Ensures a user has a profile and the four funds. Runs on every session creation, so it must be
 * cheap and idempotent: it no-ops once both already exist.
 *
 * `displayName` is untrusted caller input and is only used to populate the profile on first
 * creation — never for identity. Identity comes solely from the verified `userId`.
 */
export async function ensureUserBootstrapped(
  userId: string,
  details: { displayName?: string; email?: string }
): Promise<void> {
  const now = new Date().toISOString();
  const userRef = adminDb.collection('users').doc(userId);
  const snap = await userRef.get();

  if (!snap.exists) {
    await userRef.set({
      uid: userId,
      displayName: details.displayName?.trim() || details.email?.split('@')[0] || 'User',
      email: details.email ?? '',
      selectedCurrency: DEFAULT_CURRENCY,
      selectedLanguage: 'en',
      // On by default — a user who picks a currency with a note base wants whole notes without
      // having to discover a setting first.
      roundToNoteBase: true,
      // Off by default — a rotating savings group is an instrument most users don't have, so the
      // feature stays out of the way until it's asked for. Written explicitly rather than left
      // absent so the field is discoverable in Firestore.
      roscaEnabled: false,
      categories: DEFAULT_CATEGORIES_BY_FUND,
      createdAt: now,
      updatedAt: now,
    } satisfies UserProfile);
  }

  await initFundsFor(userId);
}
