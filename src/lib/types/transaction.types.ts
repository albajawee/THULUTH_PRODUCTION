import { FundType } from './fund.types';

export type TransactionType =
  | 'income_distribution'
  | 'expense'
  | 'transfer_in'
  | 'transfer_out'
  | 'goal_allocation'
  | 'donation'
  | 'adjustment';

export type RelatedEntityType =
  | 'income'
  | 'expense'
  | 'transfer'
  | 'goal_allocation'
  | 'donation';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  fundType: FundType;
  amount: number;
  description: string;
  relatedId: string;
  relatedType: RelatedEntityType;
  createdAt: string; // ISO string — immutable
}
