import { FundType } from './fund.types';

export type TransactionType =
  | 'income_distribution'
  | 'expense'
  | 'transfer_in'
  | 'transfer_out'
  | 'goal_allocation'
  | 'donation'
  // Neither spending nor income — a rotating savings group is net zero over a cycle. See
  // `rosca.types` and the `roscaOut`/`roscaIn` fund counters.
  | 'rosca_contribution'
  | 'rosca_payout'
  | 'reversal'
  | 'adjustment';

export type RelatedEntityType =
  | 'income'
  | 'expense'
  | 'transfer'
  | 'goal_allocation'
  | 'donation'
  | 'rosca';

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
