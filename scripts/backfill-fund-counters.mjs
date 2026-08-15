/**
 * Backfills `transferredIn` / `transferredOut` on every fund, and removes transfers from
 * `totalSpent`.
 *
 * Transfers used to increment the source fund's `totalSpent`, which counted moving your own money
 * between funds as spending it. They now increment `transferredOut` instead. Funds written under
 * the old rule need correcting once.
 *
 * The correction is a RECOMPUTATION, not an adjustment: every counter is rebuilt from the
 * incomes / expenses / donations / transfers / rosca_entries collections, which is exact because
 * reversing any of those deletes its source document (see the reverse* actions). That makes this
 * script idempotent — running it twice changes nothing the second time. It is also why reversal
 * must stay a delete and never become a `voided: true` flag.
 *
 * ROSCA note: `rosca_entries` must be included even though the feature postdates this script. The
 * balance check below reconstructs `balance` from every counter, so a user with any ROSCA activity
 * would otherwise fail it and be skipped — turning the safety net into noise that hides real
 * corruption. A contribution reduces balance via `roscaOut`; a payout raises it and counts inside
 * `totalReceived` as well as `roscaIn`, exactly as `rosca.service.ts` writes it.
 *
 * Safety: `balance` is never written. It is only recomputed and compared; if the recomputed
 * balance disagrees with the stored one for any fund, that user is REPORTED AND SKIPPED, because a
 * mismatch means something other than this migration is wrong and a blind write could destroy
 * evidence of it.
 *
 *   node scripts/backfill-fund-counters.mjs            # dry run, writes nothing
 *   node scripts/backfill-fund-counters.mjs --apply    # writes
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
  let changed = 0;
  let skipped = 0;

  for (const user of users.docs) {
    const userRef = user.ref;
    const [fundsSnap, incomes, expenses, donations, transfers, roscaEntries] = await Promise.all(
      ['funds', 'incomes', 'expenses', 'donations', 'transfers', 'rosca_entries'].map((c) =>
        userRef.collection(c).get()
      )
    );

    const zero = () => Object.fromEntries(FUNDS.map((f) => [f, 0]));
    const received = zero();
    const spent = zero();
    const tIn = zero();
    const tOut = zero();
    const roscaOut = zero();
    const roscaIn = zero();

    for (const d of incomes.docs) {
      const dist = d.data().distributions ?? {};
      for (const f of FUNDS) received[f] += dist[f] ?? 0;
    }
    for (const d of expenses.docs) {
      const e = d.data();
      if (FUNDS.includes(e.fundType)) spent[e.fundType] += e.amount ?? 0;
    }
    for (const d of donations.docs) spent.charity += d.data().amount ?? 0;
    for (const d of transfers.docs) {
      const t = d.data();
      received[t.toFund] += t.amount ?? 0;
      tIn[t.toFund] += t.amount ?? 0;
      tOut[t.fromFund] += t.amount ?? 0;
    }
    // A group's opening position (`priorContributed` / `priorReceived` on the group doc) is
    // deliberately NOT read here: it records money moved before tracking began, which never touched
    // a fund counter and must not be reconstructed into one.
    for (const d of roscaEntries.docs) {
      const e = d.data();
      if (!FUNDS.includes(e.fundType)) continue;
      if (e.type === 'contribution') {
        roscaOut[e.fundType] += e.amount ?? 0;
      } else {
        received[e.fundType] += e.amount ?? 0;
        roscaIn[e.fundType] += e.amount ?? 0;
      }
    }

    const stored = Object.fromEntries(fundsSnap.docs.map((d) => [d.id, d.data()]));
    console.log(`user ${user.id}`);

    // Verify before touching anything: recomputed balance must match what is stored.
    // `tIn` and `roscaIn` are already inside `received`, so only the outflows subtract here.
    const balanceFor = (f) => received[f] - spent[f] - tOut[f] - roscaOut[f];

    const mismatches = FUNDS.filter((f) => {
      if (!stored[f]) return false;
      return balanceFor(f) !== stored[f].balance;
    });

    if (mismatches.length > 0) {
      console.log('  SKIPPED — recomputed balance disagrees with stored balance:');
      for (const f of mismatches) {
        const expected = balanceFor(f);
        console.log(`    ${f}: stored ${money(stored[f].balance)} vs recomputed ${money(expected)}`);
      }
      console.log('  Nothing written for this user. Investigate before re-running.\n');
      skipped += 1;
      continue;
    }

    const batch = db.batch();
    let userChanged = false;

    for (const f of FUNDS) {
      const cur = stored[f];
      if (!cur) continue;
      const next = {
        totalReceived: received[f],
        totalSpent: spent[f],
        transferredIn: tIn[f],
        transferredOut: tOut[f],
        roscaOut: roscaOut[f],
        roscaIn: roscaIn[f],
      };
      const diffs = Object.entries(next).filter(([k, v]) => (cur[k] ?? 0) !== v);

      if (diffs.length === 0) {
        console.log(`  ${f.padEnd(9)} already correct`);
        continue;
      }
      userChanged = true;
      console.log(
        `  ${f.padEnd(9)} ` +
          diffs.map(([k, v]) => `${k}: ${money(cur[k] ?? 0)} -> ${money(v)}`).join(', ')
      );
      // balance is deliberately absent: verified equal above, so writing it can only add risk.
      batch.set(userRef.collection('funds').doc(f), next, { merge: true });
    }

    if (userChanged) {
      changed += 1;
      if (APPLY) {
        await batch.commit();
        console.log('  written');
      }
    }
    console.log();
  }

  console.log(`${users.size} user(s): ${changed} needing changes, ${skipped} skipped.`);
  if (changed > 0 && !APPLY) console.log('Re-run with --apply to write.');
}

run().then(
  () => process.exit(0),
  (err) => {
    console.error('FAILED:', err);
    process.exit(1);
  }
);
