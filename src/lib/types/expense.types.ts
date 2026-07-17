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
