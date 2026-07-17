import { DISTRIBUTION } from '../constants/fund-percentages';
import { IncomeDistribution, GoalProgress } from '../types';
import { differenceInMonths } from 'date-fns';

/**
 * Distributes an income amount into the four funds.
 * Uses Math.floor to avoid fractional currency units.
 */
export function distributeIncome(amount: number): IncomeDistribution {
  const stability = Math.floor(amount * DISTRIBUTION.stability);
  const growth = Math.floor(amount * DISTRIBUTION.growth);
  const life = Math.floor(amount * DISTRIBUTION.life);
  const charity = Math.floor(amount * DISTRIBUTION.charity);
  return { stability, growth, life, charity };
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
