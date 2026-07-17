import { FundType } from './fund.types';

export interface IncomeDistribution {
  stability: number;
  growth: number;
  life: number;
  charity: number;
}

export interface Income {
  id: string;
  userId: string;
  amount: number;
  source: string;
  date: string; // ISO string
  note?: string;
  distributions: IncomeDistribution;
  createdAt: string; // ISO string
}

export interface AddIncomeInput {
  amount: number;
  source: string;
  date: string;
  note?: string;
}
