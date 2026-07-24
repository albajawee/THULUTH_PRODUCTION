export type FundType = 'stability' | 'growth' | 'life' | 'charity';

export interface Fund {
  id: FundType;
  balance: number;
  /** Income distributed to this fund, plus anything transferred in. */
  totalReceived: number;
  /**
   * Money actually spent out of this fund — expenses, and donations for the charity fund.
   * Transfers to another fund are NOT spending: the money is still yours, it just sits
   * somewhere else. They are tracked in `transferredOut` instead.
   */
  totalSpent: number;
  /**
   * Optional because funds created before transfer tracking existed don't carry them. Read with
   * `?? 0`; `scripts/backfill-fund-counters.mjs` populates them from the transfer records.
   */
  transferredIn?: number;
  transferredOut?: number;
  updatedAt: string; // ISO string
}

export interface FundSummary {
  stability: Fund;
  growth: Fund;
  life: Fund;
  charity: Fund;
}
