import { FundType } from './fund.types';

export interface Transfer {
  id: string;
  userId: string;
  fromFund: FundType;
  toFund: FundType;
  amount: number;
  reason: string;
  createdAt: string;
}

export interface CreateTransferInput {
  fromFund: FundType;
  toFund: FundType;
  amount: number;
  reason: string;
}
