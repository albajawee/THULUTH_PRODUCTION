/**
 * Monthly money-flow rollup, stored at `users/{uid}/aggregates/monthly`.
 *
 * One document holds every month, keyed `YYYY-MM` (from each entry's `date`, so backdated
 * entries land in the right month). The dashboard reads this one doc instead of scanning incomes,
 * expenses and donations, so the monthly trend and month-over-month comparison are constant-time
 * regardless of history size. Maintained by the income / expense / donation server actions;
 * rebuilt by `scripts/backfill-monthly-aggregate.mjs`.
 */
export interface MonthlyBucket {
  /** Income received in the month (the full amount, before the fund split). */
  income: number;
  /** Money out in the month: expenses + donations. */
  spending: number;
}

export interface MonthlyAggregate {
  months: Record<string, MonthlyBucket>;
  updatedAt: string;
}
