/**
 * Backfills the monthly money-flow rollup at `users/{uid}/aggregates/monthly`.
 *
 * The dashboard's trend and month-over-month widgets read this one doc instead of scanning incomes,
 * expenses and donations. This script (re)builds it from those collections — the one place a full
 * scan is acceptable, because it runs once, server-side.
 *
 * Bucketed by each entry's own `date` (YYYY-MM), matching the live maintenance. `spending` is
 * expenses + donations (money out). Full REPLACE of the `months` map, so it is idempotent.
 *
 *   node scripts/backfill-monthly-aggregate.mjs            # dry run, writes nothing
 *   node scripts/backfill-monthly-aggregate.mjs --apply    # writes
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const APPLY = process.argv.includes('--apply');
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
const monthOf = (dateISO) => (dateISO ?? '').slice(0, 7);
const money = (n) => n.toLocaleString('en-US');

async function run() {
  console.log(APPLY ? 'MODE: apply (will write)\n' : 'MODE: dry run (no writes)\n');
  const users = await db.collection('users').get();
  const now = new Date().toISOString();
  let written = 0;

  for (const user of users.docs) {
    const userRef = user.ref;
    const [incomes, expenses, donations] = await Promise.all(
      ['incomes', 'expenses', 'donations'].map((c) => userRef.collection(c).get())
    );

    const months = {}; // 'YYYY-MM' -> { income, spending }
    const bump = (m, field, amt) => {
      if (!m) return;
      (months[m] ??= { income: 0, spending: 0 })[field] += amt;
    };

    for (const d of incomes.docs) bump(monthOf(d.data().date), 'income', d.data().amount ?? 0);
    for (const d of expenses.docs) bump(monthOf(d.data().date), 'spending', d.data().amount ?? 0);
    for (const d of donations.docs) bump(monthOf(d.data().date), 'spending', d.data().amount ?? 0);

    const keys = Object.keys(months).sort();
    console.log(`user ${user.id}  (${incomes.size} inc, ${expenses.size} exp, ${donations.size} don) -> ${keys.length} months`);
    for (const k of keys) {
      console.log(`  ${k}  income ${money(months[k].income).padStart(10)}  spending ${money(months[k].spending).padStart(10)}`);
    }

    if (APPLY) {
      await userRef.collection('aggregates').doc('monthly').set({ months, updatedAt: now });
      written += 1;
    }
    console.log();
  }

  console.log(`${users.size} user(s). ${APPLY ? `${written} monthly docs written.` : 'Re-run with --apply to write.'}`);
}

run().then(
  () => process.exit(0),
  (err) => { console.error('FAILED:', err); process.exit(1); }
);
