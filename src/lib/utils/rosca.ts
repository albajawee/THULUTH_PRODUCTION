import { addMonths, subMonths, parseISO, format } from 'date-fns';
import {
  RoscaGroup,
  RoscaEntry,
  RoscaRound,
  RoscaRoundStatus,
  RoscaSchedule,
  RoscaOverview,
} from '../types';

/**
 * Derives a ROSCA group's schedule and position from its config plus the entries recorded against
 * it. Nothing here is stored: round K is due `startDate + (K-1) months`, and "an entry exists for
 * round K" IS the paid flag. That keeps undo trivial (delete the entry and the round reverts) and
 * keeps `scripts/backfill-fund-counters.mjs` able to recompute counters exactly.
 *
 * Kept free of React, lucide and `fund-config` imports — same constraint as `calculations.ts` — so a
 * Server Action can use it.
 */

/** `yyyy-MM-dd` for today, in the viewer's own timezone. */
export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Due date of round `round` (1-based).
 *
 * `parseISO`, never `new Date(str)`: `new Date('2026-01-31')` is parsed as UTC midnight while
 * `format` renders local time, which shifts every derived date a day west of Greenwich. `addMonths`
 * clamps month ends, so a cycle starting 31 Jan has its second round on 28 Feb — which is what these
 * groups actually do.
 */
export function roundDueDate(startDate: string, round: number): string {
  return format(addMonths(parseISO(startDate), round - 1), 'yyyy-MM-dd');
}

/**
 * Back-solves round 1's date from whichever round the user says they're on. Someone joining an
 * existing group knows "we're on round 6, due this month", not when round 1 was.
 */
export function startDateFromRound(dueDate: string, round: number): string {
  return format(subMonths(parseISO(dueDate), round - 1), 'yyyy-MM-dd');
}

/** What the user collects on their turn, if everyone pays. */
export function payoutTotalFor(
  group: Pick<RoscaGroup, 'contributionAmount' | 'memberCount'>
): number {
  return group.contributionAmount * group.memberCount;
}

/**
 * Status of a single round.
 *
 * All comparisons are plain `yyyy-MM-dd` string comparisons — lexicographic order matches
 * chronological order for that format, so no date arithmetic is needed here at all.
 *
 * Order matters twice. `historical` is checked first, so a group joined at round 6 never shows five
 * red "overdue" rows for rounds settled long before the app was installed. And the same-month check
 * precedes the overdue check, so a round due on the 1st viewed on the 12th reads as *due* rather
 * than late — these groups collect throughout the month.
 */
export function roundStatusFor(
  round: number,
  dueDate: string,
  joinedAtRound: number,
  paid: boolean,
  today: string
): RoscaRoundStatus {
  if (round < joinedAtRound) return 'historical';
  if (paid) return 'paid';
  if (dueDate.slice(0, 7) === today.slice(0, 7)) return 'due';
  if (dueDate < today) return 'overdue';
  return 'upcoming';
}

/**
 * Builds the full derived state for one group.
 *
 * `entries` may be the whole account's entries; anything for another group is ignored, so callers
 * can pass one realtime list around rather than querying per group.
 */
export function buildRoscaSchedule(
  group: RoscaGroup,
  entries: RoscaEntry[],
  today: string = todayISO()
): RoscaSchedule {
  const byRound = new Map<number, { contribution: RoscaEntry | null; payout: RoscaEntry | null }>();
  let paidTracked = 0;
  let receivedTracked = 0;

  for (const entry of entries) {
    if (entry.groupId !== group.id) continue;
    const slot = byRound.get(entry.round) ?? { contribution: null, payout: null };
    if (entry.type === 'contribution') {
      slot.contribution = entry;
      paidTracked += entry.amount;
    } else {
      slot.payout = entry;
      receivedTracked += entry.amount;
    }
    byRound.set(entry.round, slot);
  }

  const rounds: RoscaRound[] = [];
  let paidCount = 0;
  let overdueCount = 0;
  let nextDue: RoscaRound | null = null;

  for (let round = 1; round <= group.memberCount; round++) {
    const slot = byRound.get(round);
    const contribution = slot?.contribution ?? null;
    const dueDate = roundDueDate(group.startDate, round);
    const status = roundStatusFor(
      round,
      dueDate,
      group.joinedAtRound,
      contribution !== null,
      today
    );

    if (status === 'paid') paidCount++;
    if (status === 'overdue') overdueCount++;

    const entry: RoscaRound = {
      round,
      dueDate,
      status,
      isPayoutRound: group.payoutRound === round,
      contribution,
      payout: slot?.payout ?? null,
    };
    // The soonest round still owed — 'overdue' sorts before 'due' because rounds ascend.
    if (!nextDue && (status === 'overdue' || status === 'due' || status === 'upcoming')) {
      nextDue = entry;
    }
    rounds.push(entry);
  }

  // Only rounds the app is responsible for count as outstanding; historical ones were settled
  // elsewhere and are carried by `priorContributed` instead.
  const trackedRounds = Math.max(0, group.memberCount - group.joinedAtRound + 1);
  const remainingCount = Math.max(0, trackedRounds - paidCount);

  const paidTotal = group.priorContributed + paidTracked;
  const receivedTotal = group.priorReceived + receivedTracked;
  const payoutReceived = receivedTotal > 0;

  return {
    group,
    rounds,
    paidCount,
    paidTracked,
    receivedTracked,
    paidTotal,
    receivedTotal,
    net: receivedTotal - paidTotal,
    expectedPayout: payoutTotalFor(group),
    remainingCount,
    remainingTotal: remainingCount * group.contributionAmount,
    nextDue,
    overdueCount,
    payoutReceived,
    // A group whose payout was never recorded must never report complete — silently closing it
    // would drop real money from the record.
    cycleComplete: remainingCount === 0 && payoutReceived,
    hasPriorPosition: group.joinedAtRound > 1,
    endDate: roundDueDate(group.startDate, group.memberCount),
  };
}

/** Account-wide roll-up across every group, for the dashboard card and the list page. */
export function summariseRosca(
  groups: RoscaGroup[],
  entries: RoscaEntry[],
  today: string = todayISO()
): RoscaOverview {
  const schedules = groups.map((g) => buildRoscaSchedule(g, entries, today));
  const active = schedules.filter((s) => s.group.status === 'active');

  return {
    schedules,
    activeCount: active.length,
    dueThisMonth: active.filter((s) => s.nextDue?.status === 'due').length,
    overdueCount: active.reduce((sum, s) => sum + s.overdueCount, 0),
    monthlyCommitment: active.reduce((sum, s) => sum + s.group.contributionAmount, 0),
    paidTotal: schedules.reduce((sum, s) => sum + s.paidTotal, 0),
    receivedTotal: schedules.reduce((sum, s) => sum + s.receivedTotal, 0),
    net: schedules.reduce((sum, s) => sum + s.net, 0),
  };
}
