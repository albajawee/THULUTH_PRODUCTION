/**
 * Backfills the per-fund expense analytics rollup at `users/{uid}/expense_stats/{fundType}`.
 *
 * The analytics view reads this doc instead of scanning the expenses collection, so it must exist
 * and be correct before the new fund pages render. This script (re)builds it from the expenses
 * themselves — the one place a full scan is acceptable, because it runs once, server-side, not on
 * every page view.
 *
 * It is a full REPLACE, not a merge: writing the whole computed map cleans out any stale or
 * partial entries (e.g. a category key left behind by a rename before backfill), which makes the
 * script idempotent — running it again produces the identical document.
 *
 *   node scripts/backfill-expense-stats.mjs            # dry run, writes nothing
 *   node scripts/backfill-expense-stats.mjs --apply    # writes
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const APPLY = process.argv.includes('--apply');
const FUNDS = ['stability', 'growth', 'life', 'charity'];
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  const raw = fs.readFileSync(path.join(root, '.env.local'), 'utf8');
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = loadEnv();
initializeApp({
  credential: cert({
    projectId: env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});
const db = getFirestore();
const money = (n) => n.toLocaleString('en-US');

async function run() {
  console.log(APPLY ? 'MODE: apply (will write)\n' : 'MODE: dry run (no writes)\n');
  const users = await db.collection('users').get();
  const now = new Date().toISOString();
  let written = 0;

  for (const user of users.docs) {
    const userRef = user.ref;
    const expenses = await userRef.collection('expenses').get();

    // fund -> { totalSpent, count, categories: { cat: { total, count } } }
    const perFund = Object.fromEntries(FUNDS.map((f) => [f, { totalSpent: 0, count: 0, categories: {} }]));

    for (const doc of expenses.docs) {
      const e = doc.data();
      const bucket = perFund[e.fundType];
      if (!bucket) continue; // unknown fund — ignore
      const amount = e.amount ?? 0;
      const cat = e.category ?? '(uncategorised)';
      bucket.totalSpent += amount;
      bucket.count += 1;
      const c = (bucket.categories[cat] ??= { total: 0, count: 0 });
      c.total += amount;
      c.count += 1;
    }

    console.log(`user ${user.id}  (${expenses.size} expenses)`);
    for (const fund of FUNDS) {
      const b = perFund[fund];
      const cats = Object.keys(b.categories).length;
      console.log(`  ${fund.padEnd(9)} total ${money(b.totalSpent).padStart(10)}  count ${String(b.count).padStart(4)}  categories ${cats}`);
      if (APPLY) {
        await userRef.collection('expense_stats').doc(fund).set({
          fundType: fund,
          totalSpent: b.totalSpent,
          count: b.count,
          categories: b.categories,
          updatedAt: now,
        });
        written += 1;
      }
    }
    console.log();
  }

  console.log(`${users.size} user(s). ${APPLY ? `${written} stat docs written.` : 'Re-run with --apply to write.'}`);
}

run().then(
  () => process.exit(0),
  (err) => { console.error('FAILED:', err); process.exit(1); }
);
