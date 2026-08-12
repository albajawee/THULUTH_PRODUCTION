'use server';

import { z } from 'zod';
import { adminDb } from '../firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { requireUser } from '../auth/session';
import { createRoscaGroupSchemaFor } from '../utils/validators';
import { noteBaseFor, DEFAULT_CURRENCY } from '../constants/currency';
import { RoscaGroup, RoscaEntry, UserProfile } from '../types';
import { revalidatePath } from 'next/cache';

/**
 * Rotating savings groups (ROSCA / سلفة).
 *
 * Follows `transfer.service.ts` throughout, and for the same reason: money moves, but it is neither
 * income nor spending. A contribution decrements `balance` and increments `roscaOut` — never
 * `totalSpent` — because paying into a savings group is not consuming the money. A payout increments
 * `balance`, `totalReceived` AND `roscaIn`, mirroring how a transfer in genuinely lands in a fund
 * while still being excluded from account-level income.
 *
 * Deliberately never calls `bumpMonthlyAggregate`. Every sibling service does, but that rollup holds
 * only `{ income, spending }` and drives the trend charts — feeding a 5,000 payout into it would draw
 * a spike of income that was never earned.
 */

/** Rounds before this are `historical`: they happened before the user tracked anything here. */
function isBeforeTracking(group: RoscaGroup, round: number): boolean {
  return round < group.joinedAtRound;
}

/** Firestore surfaces a failed `batch.create` as gRPC ALREADY_EXISTS (code 6). */
function isAlreadyExists(err: unknown): boolean {
  const code = (err as { code?: unknown })?.code;
  return code === 6 || code === 'already-exists';
}

function revalidateRosca(groupId: string, fundType?: string) {
  revalidatePath('/rosca');
  revalidatePath(`/rosca/${groupId}`);
  revalidatePath('/dashboard');
  revalidatePath('/reports');
  if (fundType) revalidatePath(`/funds/${fundType}`);
}

export async function createRoscaGroup(rawData: unknown) {
  const { ownerId: userId } = await requireUser();

  const userRef = adminDb.collection('users').doc(userId);

  // The note base comes from the stored profile, never the request — same as addIncome. A
  // contribution that isn't a whole banknote can't be handed over, and the payout is a whole
  // multiple exactly when the contribution is.
  const profile = (await userRef.get()).data() as UserProfile | undefined;
  const step = noteBaseFor(profile?.selectedCurrency ?? DEFAULT_CURRENCY, profile?.roundToNoteBase);

  const parsed = createRoscaGroupSchemaFor(step).safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const now = new Date().toISOString();
  const groupRef = userRef.collection('rosca_groups').doc();
  const groupId = groupRef.id;

  const batch = adminDb.batch();

  // Only two writes: creating a group moves no money, so there is no fund update and no ledger row.
  // The opening position (`priorContributed` / `priorReceived`) is recorded as fact and deliberately
  // NOT posted — that cash left the account before any of it was tracked here, and deducting it now
  // would wreck today's balance.
  batch.set(groupRef, {
    id: groupId,
    userId,
    name: data.name,
    contributionAmount: data.contributionAmount,
    memberCount: data.memberCount,
    fundType: data.fundType,
    startDate: data.startDate,
    payoutRound: data.payoutRound,
    joinedAtRound: data.joinedAtRound,
    priorContributed: data.priorContributed,
    priorReceived: data.priorReceived,
    status: 'active',
    note: data.note,
    createdAt: now,
    updatedAt: now,
  } satisfies RoscaGroup);

  const auditRef = userRef.collection('audit_logs').doc();
  batch.set(auditRef, {
    id: auditRef.id,
    userId,
    action: 'rosca_group_created',
    entityType: 'rosca_group',
    entityId: groupId,
    after: {
      name: data.name,
      contributionAmount: data.contributionAmount,
      memberCount: data.memberCount,
      fundType: data.fundType,
      joinedAtRound: data.joinedAtRound,
      priorContributed: data.priorContributed,
      priorReceived: data.priorReceived,
    },
    createdAt: now,
  });

  await batch.commit();

  revalidateRosca(groupId, data.fundType);
  return { success: true, groupId };
}

const markContributionSchema = z.object({
  groupId: z.string().min(1),
  round: z.number().int().min(1),
  date: z.string().min(1, 'Date is required'),
});

/**
 * Records one monthly contribution. The money leaves the group's fund but is NOT spending.
 *
 * Duplicate protection is the entry's deterministic id plus `batch.create`, which fails the whole
 * batch if the document already exists. That is the only atomic guarantee available here — this
 * codebase uses no transactions anywhere — and it makes a double-tapped "Mark paid" impossible to
 * charge twice, which a read-then-write check could not.
 */
export async function markRoscaContribution(rawData: unknown) {
  const { ownerId: userId } = await requireUser();

  const parsed = markContributionSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }
  const { groupId, round, date } = parsed.data;

  const userRef = adminDb.collection('users').doc(userId);
  const groupSnap = await userRef.collection('rosca_groups').doc(groupId).get();
  if (!groupSnap.exists) {
    return { success: false, error: { groupId: ['Group not found'] } };
  }
  const group = groupSnap.data() as RoscaGroup;

  if (group.status !== 'active') {
    return { success: false, error: { round: ['This group is closed'] } };
  }
  if (round > group.memberCount) {
    return { success: false, error: { round: ['Round is outside this group'] } };
  }
  // Already covered by `priorContributed`; posting it would deduct pre-tracking cash from today.
  if (isBeforeTracking(group, round)) {
    return { success: false, error: { round: ['That round was settled before you started tracking'] } };
  }

  const amount = group.contributionAmount;
  const fundSnap = await userRef.collection('funds').doc(group.fundType).get();
  const fundBalance = (fundSnap.data()?.balance ?? 0) as number;
  if (fundBalance < amount) {
    return { success: false, error: { amount: [`Insufficient ${group.fundType} fund balance`] } };
  }

  const now = new Date().toISOString();
  const batch = adminDb.batch();
  const entryRef = userRef.collection('rosca_entries').doc(`${groupId}_c${round}`);

  batch.create(entryRef, {
    id: entryRef.id,
    userId,
    groupId,
    type: 'contribution',
    round,
    amount,
    fundType: group.fundType,
    date,
    createdAt: now,
  } satisfies RoscaEntry);

  // `roscaOut`, NOT `totalSpent` — see the file header.
  batch.set(
    userRef.collection('funds').doc(group.fundType),
    {
      id: group.fundType,
      balance: FieldValue.increment(-amount),
      roscaOut: FieldValue.increment(amount),
      updatedAt: now,
    },
    { merge: true }
  );

  const txRef = userRef.collection('transactions').doc();
  batch.set(txRef, {
    id: txRef.id,
    userId,
    type: 'rosca_contribution',
    fundType: group.fundType,
    amount: -amount,
    description: `ROSCA contribution — ${group.name} (round ${round})`,
    relatedId: entryRef.id,
    relatedType: 'rosca',
    createdAt: now,
  });

  const auditRef = userRef.collection('audit_logs').doc();
  batch.set(auditRef, {
    id: auditRef.id,
    userId,
    action: 'rosca_contribution_marked',
    entityType: 'rosca_entry',
    entityId: entryRef.id,
    after: { groupId, round, amount, fundType: group.fundType, date },
    createdAt: now,
  });

  try {
    await batch.commit();
  } catch (err) {
    if (isAlreadyExists(err)) {
      return { success: false, error: { round: ['This round is already recorded'] } };
    }
    throw err;
  }

  revalidateRosca(groupId, group.fundType);
  return { success: true, entryId: entryRef.id };
}

const recordPayoutSchema = z.object({
  groupId: z.string().min(1),
  amount: z
    .number({ error: 'Amount must be a number' })
    .positive('Amount must be positive')
    .max(1_000_000_000, 'Amount is too large'),
  date: z.string().min(1, 'Date is required'),
});

/**
 * Records the round where the whole pot comes to the user.
 *
 * Takes no `round` — it reads `group.payoutRound`, so the entry and the group can never disagree
 * about which round was the turn. `amount` is user-supplied rather than forced to
 * `contribution × members`, because organiser fees and defaulting members make the real figure
 * differ often enough to matter.
 */
export async function recordRoscaPayout(rawData: unknown) {
  const { ownerId: userId } = await requireUser();

  const parsed = recordPayoutSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }
  const { groupId, amount, date } = parsed.data;

  const userRef = adminDb.collection('users').doc(userId);
  const groupSnap = await userRef.collection('rosca_groups').doc(groupId).get();
  if (!groupSnap.exists) {
    return { success: false, error: { groupId: ['Group not found'] } };
  }
  const group = groupSnap.data() as RoscaGroup;

  if (group.status !== 'active') {
    return { success: false, error: { amount: ['This group is closed'] } };
  }
  if (group.payoutRound === null) {
    return { success: false, error: { amount: ['Set which round is your turn before recording the payout'] } };
  }
  // The turn passed before tracking began; `priorReceived` already carries it. Posting it here
  // would credit the fund a second time with money the user has long since had.
  if (isBeforeTracking(group, group.payoutRound)) {
    return {
      success: false,
      error: { amount: ['Your turn came before you started tracking — it is already counted in this group'] },
    };
  }

  const now = new Date().toISOString();
  const batch = adminDb.batch();
  const entryRef = userRef.collection('rosca_entries').doc(`${groupId}_p${group.payoutRound}`);

  batch.create(entryRef, {
    id: entryRef.id,
    userId,
    groupId,
    type: 'payout',
    round: group.payoutRound,
    amount,
    fundType: group.fundType,
    date,
    createdAt: now,
  } satisfies RoscaEntry);

  // Counts as received (the fund really did gain it) AND is tracked in `roscaIn`, so account-level
  // income can subtract it back out — exactly how `transferredIn` behaves.
  batch.set(
    userRef.collection('funds').doc(group.fundType),
    {
      id: group.fundType,
      balance: FieldValue.increment(amount),
      totalReceived: FieldValue.increment(amount),
      roscaIn: FieldValue.increment(amount),
      updatedAt: now,
    },
    { merge: true }
  );

  const txRef = userRef.collection('transactions').doc();
  batch.set(txRef, {
    id: txRef.id,
    userId,
    type: 'rosca_payout',
    fundType: group.fundType,
    amount,
    description: `ROSCA payout — ${group.name} (round ${group.payoutRound})`,
    relatedId: entryRef.id,
    relatedType: 'rosca',
    createdAt: now,
  });

  const auditRef = userRef.collection('audit_logs').doc();
  batch.set(auditRef, {
    id: auditRef.id,
    userId,
    action: 'rosca_payout_recorded',
    entityType: 'rosca_entry',
    entityId: entryRef.id,
    after: { groupId, round: group.payoutRound, amount, fundType: group.fundType, date },
    createdAt: now,
  });

  try {
    await batch.commit();
  } catch (err) {
    if (isAlreadyExists(err)) {
      return { success: false, error: { amount: ['Your payout is already recorded'] } };
    }
    throw err;
  }

  revalidateRosca(groupId, group.fundType);
  return { success: true, entryId: entryRef.id };
}

const setPayoutRoundSchema = z.object({
  groupId: z.string().min(1),
  payoutRound: z.number().int().min(1).nullable(),
});

/**
 * Sets (or clears) which round is the user's turn — often decided by a draw partway through.
 *
 * Refuses once a payout entry exists, because the entry's id encodes the round it was recorded
 * against. Changing the group's turn underneath it would leave an entry filed at `_p3` while the
 * group claims round 7, and nothing would ever reconcile them again.
 */
export async function setRoscaPayoutRound(rawData: unknown) {
  const { ownerId: userId } = await requireUser();

  const parsed = setPayoutRoundSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: 'Invalid request' };
  }
  const { groupId, payoutRound } = parsed.data;

  const userRef = adminDb.collection('users').doc(userId);
  const groupRef = userRef.collection('rosca_groups').doc(groupId);
  const groupSnap = await groupRef.get();
  if (!groupSnap.exists) {
    return { success: false, error: 'Group not found' };
  }
  const group = groupSnap.data() as RoscaGroup;

  if (payoutRound !== null && payoutRound > group.memberCount) {
    return { success: false, error: 'That round is past the end of this group' };
  }

  if (group.payoutRound !== null) {
    const existing = await userRef
      .collection('rosca_entries')
      .doc(`${groupId}_p${group.payoutRound}`)
      .get();
    if (existing.exists) {
      return {
        success: false,
        error: 'Your payout is already recorded. Undo it first, then change your turn.',
      };
    }
  }

  const now = new Date().toISOString();
  const batch = adminDb.batch();

  batch.set(groupRef, { payoutRound, updatedAt: now }, { merge: true });

  const auditRef = userRef.collection('audit_logs').doc();
  batch.set(auditRef, {
    id: auditRef.id,
    userId,
    action: 'rosca_payout_round_set',
    entityType: 'rosca_group',
    entityId: groupId,
    before: { payoutRound: group.payoutRound },
    after: { payoutRound },
    createdAt: now,
  });

  await batch.commit();

  revalidateRosca(groupId);
  return { success: true };
}

const setStatusSchema = z.object({
  groupId: z.string().min(1),
  status: z.enum(['active', 'completed', 'cancelled']),
});

/**
 * Opens, closes or abandons a group. Pure metadata — no money moves.
 *
 * `cancelled` is what leaving mid-cycle looks like, and nothing is reversed when it happens: the
 * contributions really were paid and the payout really was collected. There is deliberately no
 * delete action for a group; unlike a goal, a group has moved real money, and erasing it would
 * strand the fund counters it produced.
 */
export async function setRoscaStatus(rawData: unknown) {
  const { ownerId: userId } = await requireUser();

  const parsed = setStatusSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: 'Invalid request' };
  }
  const { groupId, status } = parsed.data;

  const userRef = adminDb.collection('users').doc(userId);
  const groupRef = userRef.collection('rosca_groups').doc(groupId);
  const groupSnap = await groupRef.get();
  if (!groupSnap.exists) {
    return { success: false, error: 'Group not found' };
  }
  const group = groupSnap.data() as RoscaGroup;

  const now = new Date().toISOString();
  const batch = adminDb.batch();

  batch.set(groupRef, { status, updatedAt: now }, { merge: true });

  const auditRef = userRef.collection('audit_logs').doc();
  batch.set(auditRef, {
    id: auditRef.id,
    userId,
    action: 'rosca_status_changed',
    entityType: 'rosca_group',
    entityId: groupId,
    before: { status: group.status },
    after: { status },
    createdAt: now,
  });

  await batch.commit();

  revalidateRosca(groupId);
  return { success: true };
}

const reverseEntrySchema = z.object({ entryId: z.string().min(1) });

/**
 * Undoes one recorded contribution or payout.
 *
 * Reversal model, as everywhere else: the working entry is deleted so the round reverts to unpaid,
 * the fund counters are restored by the exact negation, and the immutable ledger keeps the original
 * row and gains a `reversal` row. History is never rewritten.
 *
 * Only a payout needs a guard — undoing it pulls money back out of the fund, and if that money has
 * since been spent the fund can't return it. Undoing a contribution only ever gives money back.
 * Allowed on closed groups too, so a mistake stays fixable after the cycle ends.
 */
export async function reverseRoscaEntry(rawData: unknown) {
  const { ownerId: userId } = await requireUser();

  const parsed = reverseEntrySchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: 'Invalid request' };
  }
  const { entryId } = parsed.data;

  const userRef = adminDb.collection('users').doc(userId);
  const entryRef = userRef.collection('rosca_entries').doc(entryId);
  const entrySnap = await entryRef.get();
  if (!entrySnap.exists) {
    return { success: false, error: 'Entry not found' };
  }
  const entry = entrySnap.data() as RoscaEntry;
  const { groupId, type, round, amount, fundType } = entry;

  if (type === 'payout') {
    const fundSnap = await userRef.collection('funds').doc(fundType).get();
    const balance = (fundSnap.data()?.balance ?? 0) as number;
    if (balance < amount) {
      return {
        success: false,
        error: `Can't undo — the ${fundType} fund no longer has ${amount} to return. It was spent after the payout.`,
      };
    }
  }

  const now = new Date().toISOString();
  const batch = adminDb.batch();

  batch.delete(entryRef);

  if (type === 'contribution') {
    batch.set(
      userRef.collection('funds').doc(fundType),
      {
        id: fundType,
        balance: FieldValue.increment(amount),
        roscaOut: FieldValue.increment(-amount),
        updatedAt: now,
      },
      { merge: true }
    );
  } else {
    batch.set(
      userRef.collection('funds').doc(fundType),
      {
        id: fundType,
        balance: FieldValue.increment(-amount),
        totalReceived: FieldValue.increment(-amount),
        roscaIn: FieldValue.increment(-amount),
        updatedAt: now,
      },
      { merge: true }
    );
  }

  const revRef = userRef.collection('transactions').doc();
  batch.set(revRef, {
    id: revRef.id,
    userId,
    type: 'reversal',
    fundType,
    // Signed by what the undo actually moved: a reversed contribution returns money to the fund,
    // a reversed payout takes it back out.
    amount: type === 'contribution' ? amount : -amount,
    description: `Reversed ROSCA ${type} (round ${round})`,
    relatedId: entryId,
    relatedType: 'rosca',
    createdAt: now,
  });

  const auditRef = userRef.collection('audit_logs').doc();
  batch.set(auditRef, {
    id: auditRef.id,
    userId,
    action: 'rosca_entry_reversed',
    entityType: 'rosca_entry',
    entityId: entryId,
    before: { groupId, type, round, amount, fundType, date: entry.date },
    createdAt: now,
  });

  await batch.commit();

  revalidateRosca(groupId, fundType);
  return { success: true };
}
