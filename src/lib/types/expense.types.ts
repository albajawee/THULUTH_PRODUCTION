import { FundType } from './fund.types';
import { StabilityCategory, LifeCategory, GrowthCategory } from '../constants/fund-categories';

export type ExpenseCategory = StabilityCategory | LifeCategory | GrowthCategory | 'other';

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
