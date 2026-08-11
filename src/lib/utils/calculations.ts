import { DISTRIBUTION_POINTS, TOTAL_POINTS } from '../constants/fund-percentages';
import { IncomeDistribution, GoalProgress, FundType } from '../types';
import { differenceInMonths } from 'date-fns';

/**
 * Order used to break ties when handing out the leftover step (see `distributeIncome`). Declared
 * here rather than imported from `fund-config`, which pulls in React icon components — this module
 * runs inside a Server Action.
 */
const TIE_BREAK_ORDER: FundType[] = ['stability', 'growth', 'life', 'charity'];

/**
 * Distributes an income amount into the four funds, in whole multiples of `step`.
 *
 * `step` is the smallest amount the currency can actually express — 1 for currencies whose base
 * unit is spendable, 250 for the Iraqi dinar, whose smallest banknote is the 250 note (see
 * `constants/currency`). A share of 5,650 IQD is not a real sum of money in Iraq; 5,500 or 5,750
 * are. Passing the step in rather than reading a setting keeps this function pure and identical on
 * both sides of the wire: the browser previews the split, the server commits it, and the two must
 * never disagree.
 *
 * Allocation is by largest remainder: every fund first takes its floor share, then the steps left
 * over go one at a time to the funds whose truncated fraction was biggest. That matters because
 * naive flooring silently destroys money — at step 250 it could drop nearly a full step per fund,
 * and even at step 1 the old code lost up to 3 units per income. Here the four shares always add
 * back up to `amount` rounded down to a whole step, so nothing goes missing inside the split.
 *
 * `amount` is expected to be a whole number of steps — `addIncomeSchemaFor` refuses anything else
 * before it reaches here, because a sub-step remainder has nowhere honest to go. The leading floor
 * is kept as a guarantee rather than an assumption: whatever it is handed, the shares it returns
 * are always whole notes.
 */
export function distributeIncome(amount: number, step = 1): IncomeDistribution {
  const safeStep = Number.isFinite(step) && step >= 1 ? Math.floor(step) : 1;
  const steps = Math.floor(amount / safeStep);

  // Integer maths throughout: `steps * points` is exact, so the floors and remainders below are too.
  const shares = TIE_BREAK_ORDER.map((fund) => {
    const scaled = steps * DISTRIBUTION_POINTS[fund];
    return {
      fund,
      whole: Math.floor(scaled / TOTAL_POINTS),
      remainder: scaled % TOTAL_POINTS,
    };
  });

  let leftover = steps - shares.reduce((sum, s) => sum + s.whole, 0);

  // Biggest truncated fraction first; ties fall to the earlier fund in TIE_BREAK_ORDER, so the
  // result is deterministic and the client's preview matches the server's commit exactly.
  const byRemainder = [...shares].sort((a, b) => b.remainder - a.remainder);
  for (const share of byRemainder) {
    if (leftover <= 0) break;
    share.whole += 1;
    leftover -= 1;
  }

  const result = {} as IncomeDistribution;
  for (const { fund, whole } of shares) {
    result[fund] = whole * safeStep;
  }
  return result;
}

/**
 * Calculates goal progress using the linked fund's current balance.
 * No money is moved to goals — progress is purely visual.
 */
export function calcGoalProgress(
  targetAmount: number,
  fundBalance: number,
  deadline: string
): GoalProgress {
  const percentage = targetAmount > 0
    ? Math.min(100, Math.round((fundBalance / targetAmount) * 100))
    : 0;
  const remaining = Math.max(0, targetAmount - fundBalance);

  let estimatedCompletionDate: string | null = null;
  if (remaining === 0) {
    estimatedCompletionDate = new Date().toISOString();
  }

  return { percentage, remaining, estimatedCompletionDate };
}

/**
 * Returns the average monthly income over the last N months of transactions.
 */
export function calcAverageMonthlyIncome(
  incomeAmounts: { amount: number; date: string }[]
): number {
  if (incomeAmounts.length === 0) return 0;
  const total = incomeAmounts.reduce((sum, i) => sum + i.amount, 0);
  const dates = incomeAmounts.map((i) => new Date(i.date));
  const earliest = new Date(Math.min(...dates.map((d) => d.getTime())));
  const months = Math.max(1, differenceInMonths(new Date(), earliest));
  return total / months;
}
