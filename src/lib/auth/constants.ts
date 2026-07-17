/**
 * Runtime-neutral auth constants.
 *
 * Kept separate from `session.ts` on purpose: that module is `server-only` and imports
 * firebase-admin, which requires the Node runtime. `proxy.ts` needs the cookie name but runs in a
 * different runtime, so it can only import from here.
 *
 * `__session` is not an arbitrary choice — it is the only cookie name Firebase Hosting will
 * forward to the origin. Renaming it breaks auth on Firebase hosting.
 */
export const SESSION_COOKIE = '__session';

/** 14 days — the Firebase maximum for a session cookie. */
export const SESSION_MAX_AGE_MS = 60 * 60 * 24 * 14 * 1000;
