import 'server-only';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    // Fail loudly and clearly. Without this, a missing key surfaces as
    // "Cannot read properties of undefined (reading 'replace')" during the Vercel build,
    // which gives no hint that an environment variable is the problem.
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Set the Firebase Admin credentials in your hosting environment (see .env.local.example).`
    );
  }
  return value;
}

/**
 * Normalizes a service-account private key into real PEM.
 *
 * The same secret gets pasted into three places that treat quoting differently: a `.env` file
 * (dotenv strips surrounding quotes), the Vercel/GitHub env UI (stores the value verbatim,
 * quotes included), and shells. A stray leading `"` corrupts the PEM, and node's crypto then
 * fails deep inside token signing — which surfaced as a generic 401 at sign-in with no hint
 * that the credential was the problem.
 */
function normalizePrivateKey(raw: string): string {
  let key = raw.trim();

  // Strip a matched pair of surrounding quotes, however many layers of pasting added them.
  while (key.length > 1 && ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'")))) {
    key = key.slice(1, -1).trim();
  }

  // Accept the key whether pasted with escaped "\n" (as in .env files) or real newlines.
  key = key.replace(/\\n/g, '\n').replace(/\r\n/g, '\n');

  if (!key.startsWith('-----BEGIN') || !key.includes('-----END')) {
    throw new Error(
      'FIREBASE_ADMIN_PRIVATE_KEY is not a valid PEM key. It must start with ' +
        '"-----BEGIN PRIVATE KEY-----". When setting it in Vercel, paste the key WITHOUT the ' +
        'surrounding quotes used in .env.local.'
    );
  }

  return key.endsWith('\n') ? key : `${key}\n`;
}

function initAdminApp(): App {
  if (getApps().length > 0) return getApps()[0];

  const projectId = requireEnv('FIREBASE_ADMIN_PROJECT_ID').trim().replace(/^["']|["']$/g, '');
  const clientEmail = requireEnv('FIREBASE_ADMIN_CLIENT_EMAIL').trim().replace(/^["']|["']$/g, '');
  const privateKey = normalizePrivateKey(requireEnv('FIREBASE_ADMIN_PRIVATE_KEY'));

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  });
}

const adminApp = initAdminApp();

export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
