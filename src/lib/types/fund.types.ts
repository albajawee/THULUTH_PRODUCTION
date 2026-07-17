export type FundType = 'stability' | 'growth' | 'life' | 'charity';

export interface Fund {
  id: FundType;
  balance: number;
  totalReceived: number;
  totalSpent: number;
  updatedAt: string; // ISO string
}

export interface FundSummary {
  stability: Fund;
  growth: Fund;
  life: Fund;
  charity: Fund;
}
