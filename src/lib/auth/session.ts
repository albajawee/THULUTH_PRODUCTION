import 'server-only';
import { cookies } from 'next/headers';
import { adminAuth } from '../firebase/admin';
import { SESSION_COOKIE, SESSION_MAX_AGE_MS } from './constants';

export { SESSION_COOKIE, SESSION_MAX_AGE_MS };

export class UnauthorizedError extends Error {
  constructor(message = 'Not authenticated') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export interface Session {
  /**
   * The tenant that owns the data being read/written.
   *
   * Today this is always the user's own uid — THULUTH is single-tenant per SAAS_PLAN.md §9.
   * It exists as a distinct concept so that if a tenant boundary is ever introduced (household
   * accounts, accountant access), the mapping changes *here* rather than at ~40 call sites.
   * Callers should prefer `ownerId` over `uid` when addressing data.
   */
  ownerId: string;
  /** The authenticated principal. Use for identity/audit, not for addressing data. */
  uid: string;
  email?: string;
  emailVerified: boolean;
}

/**
 * Reads and verifies the session cookie. Returns null when absent or invalid.
 *
 * `checkRevoked: true` costs a lookup but means signing out / disabling an account takes effect
 * immediately instead of lingering for the cookie's remaining lifetime. For an app holding
 * financial records that tradeoff is worth it.
 */
export async function getSession(): Promise<Session | null> {
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!cookie) return null;

  try {
    const decoded = await adminAuth.verifySessionCookie(cookie, true);
    return {
      ownerId: decoded.uid,
      uid: decoded.uid,
      email: decoded.email,
      emailVerified: decoded.email_verified ?? false,
    };
  } catch {
    // Expired, revoked, or forged. Callers treat all three the same: not authenticated.
    return null;
  }
}

/**
 * The gate for every server action and protected page.
 *
 * Server actions are public HTTP endpoints. Any action that takes a userId from its caller is
 * trusting the browser about identity — so no action should accept one. Call this instead.
 */
export async function requireUser(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  return session;
}
