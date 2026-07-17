import { FundType } from '../types';

export const DISTRIBUTION: Record<FundType, number> = {
  stability: 0.33,
  growth: 0.33,
  life: 0.33,
  charity: 0.01,
} as const;

export const TOTAL_DISTRIBUTION = Object.values(DISTRIBUTION).reduce((a, b) => a + b, 0);
