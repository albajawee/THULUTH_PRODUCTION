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

function initAdminApp(): App {
  if (getApps().length > 0) return getApps()[0];

  const projectId = requireEnv('FIREBASE_ADMIN_PROJECT_ID');
  const clientEmail = requireEnv('FIREBASE_ADMIN_CLIENT_EMAIL');
  // Accept the key whether pasted with escaped "\n" (as in .env files) or real newlines.
  const privateKey = requireEnv('FIREBASE_ADMIN_PRIVATE_KEY').replace(/\\n/g, '\n');

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  });
}

const adminApp = initAdminApp();

export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
