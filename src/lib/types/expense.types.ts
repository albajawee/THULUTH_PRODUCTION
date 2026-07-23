import { FundType } from './fund.types';

/** Categories are user-managed freeform strings (see constants/fund-categories.ts). */
export type ExpenseCategory = string;

export interface Expense {
  id: string;
  userId: string;
  fundType: FundType;
  category: ExpenseCategory;
  amount: number;
  description: string;
  date: string; // ISO string
  createdAt: string; // ISO string
}

export interface AddExpenseInput {
  fundType: FundType;
  category: ExpenseCategory;
  amount: number;
  description: string;
  date: string;
}

/** One category's running totals within a fund. */
export interface CategoryAggregate {
  total: number;
  count: number;
}

/**
 * Maintained per-fund expense aggregate, stored at `users/{uid}/expense_stats/{fundType}`.
 *
 * This is a running rollup written by the expense server actions, never derived from the expense
 * list at read time — so the analytics view costs one document read no matter how many thousands
 * of expenses the fund holds, and never depends on how much history pagination has loaded.
 * `scripts/backfill-expense-stats.mjs` (re)builds it from the expenses collection.
 */
export interface FundExpenseStats {
  fundType: FundType;
  totalSpent: number;
  count: number;
  /** Keyed by category label — bounded by the 30-category-per-fund cap. */
  categories: Record<string, CategoryAggregate>;
  updatedAt: string;
}
