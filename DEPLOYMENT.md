# Deploying THULUTH to Vercel

This app is a Next.js 16 (App Router) project backed by Firebase (client SDK for reads,
Admin SDK for writes). It builds cleanly with `next build`. The only things that make a
fresh deploy fail are **missing environment variables** and **undeployed Firebase config** —
both are covered below.

---

## 1. Import the repo into Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import the `THULUTH_PRODUCTION` repo.
2. Framework preset: **Next.js** (auto-detected). Leave build command and output as default —
   Vercel runs `next build` automatically.
3. **Do not deploy yet.** Add the environment variables first (next section), otherwise the
   build fails at "Collecting page data" because the Firebase Admin SDK initializes at load.

## 2. Environment variables (required)

In Vercel → Project → **Settings → Environment Variables**, add all nine. Set them for
**Production, Preview, and Development**. Copy the values from your local `.env.local`
(the file `.env.local.example` lists every key).

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Public client key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | e.g. `your-project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | |
| `FIREBASE_ADMIN_PROJECT_ID` | Server-only |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Service-account email |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Service-account private key — see note below |

**The private key — the one that bites everyone:** paste the key **without the surrounding
double quotes**. Those quotes exist only for `.env.local`, where dotenv strips them; Vercel
stores whatever you paste *verbatim*, so a leading `"` becomes part of the key and corrupts
the PEM. The symptom is sign-in appearing to work and then failing with
*"Could not establish a session"*, because the password check happens in the browser while the
cookie is minted on the server.

Correct value to paste (starts with `-`, ends with `-`):

```
-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n
```

The `\n` sequences may stay escaped, or you can paste the key as real multiple lines — the app
normalizes both, and now also strips stray surrounding quotes and fails with an explicit
"not a valid PEM key" message instead of a silent 401. If a variable is missing entirely, the
build fails with a clear `Missing required environment variable: …` message.

## 3. Firebase configuration (one-time)

The app reads Firestore from the client under security rules, and those rules + indexes must be
live in the Firebase project — Vercel does not deploy them. From the repo root:

```bash
npm i -g firebase-tools    # if you don't have it
firebase login
firebase deploy --only firestore:rules,firestore:indexes
```

- **Rules** (`firestore.rules`): every subcollection is client-read-only; all writes go through
  server actions. Without these deployed, client reads may be denied.
- **Indexes** (`firestore.indexes.json`): the expense/transaction/goal list queries need these
  composite indexes, or those realtime views error with "requires an index".

**Authorized domains (only if you add OAuth later):** email/password sign-in works from any
domain, so nothing is needed now. If you ever add Google/social sign-in, add your Vercel domain
under Firebase Console → Authentication → Settings → Authorized domains.

## 4. Deploy

Trigger the deploy. On success you'll get `https://thuluth-production.vercel.app` (or your custom
domain). The session cookie is automatically `Secure` in production (HTTPS), and the proxy
redirects unauthenticated users to `/login`.

## 5. Post-deploy smoke test

1. Open the URL → you should be redirected to `/login`.
2. Register a new account → you land on the dashboard with four funds initialized.
3. Add income → confirm the 33/33/33/1 split.
4. Switch language to Arabic in Settings → the UI renders right-to-left in Arabic.

---

## Notes / known follow-ups (from SAAS_PLAN.md)

- **CI** (`.github/workflows/ci.yml`) runs typecheck, lint, build, and an en/ar translation-parity
  check on every push. For the build job to pass in CI, add the same env vars as **GitHub Actions
  secrets** (repo → Settings → Secrets and variables → Actions).
- Rate limiting, account deletion (GDPR), and email verification are listed as pre-launch
  hardening in `SAAS_PLAN.md` §4.4 — not blockers for a first deploy, but do them before real users.
</content>
