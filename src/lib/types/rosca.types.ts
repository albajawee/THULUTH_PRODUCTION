import { FundType } from './fund.types';

/**
 * ROSCA — a rotating savings group (Arabic: سلفة).
 *
 * A fixed group of N people each pay a fixed amount every month, and each month the whole pot goes
 * to one member. Over a full cycle a member pays N × amount and receives N × amount, so the
 * arrangement is **net zero**: the monthly contribution is not spending and the payout is not
 * income. That is the whole reason this lives outside the income/expense model — see the `roscaOut`
 * and `roscaIn` counters on `Fund`.
 */

export type RoscaStatus = 'active' | 'completed' | 'cancelled';

export type RoscaEntryType = 'contribution' | 'payout';

/**
 * `historical` is a round that fell before the user started tracking in this app (see
 * `RoscaGroup.joinedAtRound`). It is displayed and counted in the group's position, but it is never
 * actionable and never moved any money here.
 */
export type RoscaRoundStatus = 'historical' | 'paid' | 'due' | 'overdue' | 'upcoming';

export interface RoscaGroup {
  id: string;
  userId: string;
  name: string;
  contributionAmount: number;
  /** Number of participants — also the number of rounds in a full cycle. */
  memberCount: number;
  /** Contributions leave this fund and the payout returns to it. */
  fundType: FundType;
  /** Round 1's due date. Derived at creation from the round the user is actually on. */
  startDate: string; // 'YYYY-MM-DD'
  /** Which round is the user's turn to collect. `null` until the draw happens. */
  payoutRound: number | null;

  /**
   * Opening position — the group as it stood when tracking began.
   *
   * Most users add a group that is already under way: joining at round 6 of 10 means rounds 1-5 were
   * paid out of an account this app never saw. These three fields record that history so the group's
   * position is truthful, and they deliberately move **no money** — no fund counters, no ledger rows,
   * no report entries. Posting them would deduct months-old cash from today's balance.
   *
   * The two amounts are stored explicitly rather than derived from `joinedAtRound` so an irregular
   * history (a round paid late, a payout cut by an organiser fee) is representable exactly.
   */
  joinedAtRound: number; // 1 = tracked from the very beginning
  priorContributed: number; // 0 when joinedAtRound === 1
  priorReceived: number; // 0 unless the turn had already passed

  status: RoscaStatus;
  /** Optional — empty string means absent. See the note on `addExpenseSchema.description`. */
  note: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * One real money movement. Only rounds at or after `joinedAtRound` produce entries.
 *
 * `amount` and `fundType` are stored on the entry rather than read back off the group, so a later
 * "pay from Life, receive into Growth" option is a group-schema change with no data migration — and
 * so a reversal always restores exactly what was taken.
 */
export interface RoscaEntry {
  /** Deterministic: `{groupId}_c{round}` / `{groupId}_p{round}`. See `rosca.service`. */
  id: string;
  userId: string;
  groupId: string;
  type: RoscaEntryType;
  round: number; // 1-based
  amount: number;
  fundType: FundType;
  /** When the money actually moved — user-supplied, independent of the round's due date. */
  date: string; // 'YYYY-MM-DD'
  createdAt: string;
}

export interface RoscaRound {
  round: number;
  dueDate: string;
  status: RoscaRoundStatus;
  isPayoutRound: boolean;
  contribution: RoscaEntry | null;
  payout: RoscaEntry | null;
}

/**
 * A group's full derived state.
 *
 * Tracked and total figures are kept apart on purpose: the `*Tracked` pair must reconcile exactly
 * against the fund's `roscaOut`/`roscaIn` counters, while the `*Total` pair is the user's true
 * position in the group including everything that happened before tracking began. Any UI showing a
 * total must say so when `hasPriorPosition`, or the figure silently disagrees with the fund page.
 */
export interface RoscaSchedule {
  group: RoscaGroup;
  rounds: RoscaRound[];
  /** Rounds with a recorded contribution entry (excludes historical ones). */
  paidCount: number;
  paidTracked: number;
  receivedTracked: number;
  paidTotal: number; // priorContributed + paidTracked
  receivedTotal: number; // priorReceived + receivedTracked
  /** receivedTotal − paidTotal. Negative until the turn comes; ~0 over a completed cycle. */
  net: number;
  expectedPayout: number;
  remainingCount: number;
  remainingTotal: number;
  nextDue: RoscaRound | null;
  overdueCount: number;
  payoutReceived: boolean;
  cycleComplete: boolean;
  hasPriorPosition: boolean;
  endDate: string;
}

export interface RoscaOverview {
  schedules: RoscaSchedule[];
  activeCount: number;
  dueThisMonth: number;
  overdueCount: number;
  /** Sum of the monthly contribution across active groups. */
  monthlyCommitment: number;
  paidTotal: number;
  receivedTotal: number;
  net: number;
}
