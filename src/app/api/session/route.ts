import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { adminAuth } from '@/lib/firebase/admin';
import { ensureUserBootstrapped } from '@/lib/services/bootstrap';
import { SESSION_COOKIE, SESSION_MAX_AGE_MS, getSession } from '@/lib/auth/session';

// firebase-admin requires the Node runtime; it cannot run on Edge.
export const runtime = 'nodejs';

const createSessionSchema = z.object({
  idToken: z.string().min(1, 'idToken is required'),
  // Only used to seed the profile on first sign-up. Never used for identity.
  displayName: z.string().max(100).optional(),
});

/**
 * Exchanges a Firebase ID token for an HttpOnly session cookie.
 *
 * Why this exists: the client previously wrote the raw ID token to `document.cookie`, which made
 * it readable by any script on the page and expired it after exactly one hour with no refresh.
 * A session cookie is HttpOnly (not script-readable) and lives up to 14 days.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = createSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  try {
    // checkRevoked: true — a token from a session that has since been signed out must not mint
    // a fresh 14-day cookie.
    const decoded = await adminAuth.verifyIdToken(parsed.data.idToken, true);

    const sessionCookie = await adminAuth.createSessionCookie(parsed.data.idToken, {
      expiresIn: SESSION_MAX_AGE_MS,
    });

    // Bootstrap with the *verified* uid, not anything the client claimed.
    await ensureUserBootstrapped(decoded.uid, {
      displayName: parsed.data.displayName ?? decoded.name,
      email: decoded.email,
    });

    (await cookies()).set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_MS / 1000,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // The response stays generic — it must not leak whether the token was expired, malformed,
    // or revoked. The *log* is the opposite: a misconfigured credential in production is
    // indistinguishable from a bad password without it.
    console.error('[api/session] Failed to establish session:', error);

    // A `auth/…` code means Firebase rejected the caller's token; anything else (bad service
    // account, unreachable Firestore) is our fault and should read as 500, not 401.
    const code = (error as { code?: string })?.code ?? '';
    const isClientAuthFailure = code.startsWith('auth/');

    return isClientAuthFailure
      ? NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
      : NextResponse.json({ error: 'Session service unavailable' }, { status: 500 });
  }
}

/** Signs out: revokes refresh tokens server-side, then clears the cookie. */
export async function DELETE() {
  const session = await getSession();

  if (session) {
    try {
      // Invalidates every session for this user, so the cookie can't outlive the sign-out.
      await adminAuth.revokeRefreshTokens(session.uid);
    } catch {
      // Best effort — clearing the cookie below still signs this browser out.
    }
  }

  (await cookies()).delete(SESSION_COOKIE);
  return NextResponse.json({ success: true });
}
