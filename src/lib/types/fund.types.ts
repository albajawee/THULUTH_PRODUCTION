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
  /**
   * Lifetime money paid into rotating savings groups (ROSCA) out of this fund. Contributions land
   * here and NOT in `totalSpent`, for the same reason transfers land in `transferredOut`: paying
   * into a savings group is not consuming the money, you get it all back over the cycle.
   *
   * Lifetime, like `transferredOut` — it never decreases when a cycle completes, so it is not
   * "currently outstanding" (that would be `roscaOut - roscaIn`).
   */
  roscaOut?: number;
  /**
   * Payouts collected into this fund. Also counted inside `totalReceived` (the fund really did gain
   * the money), and tracked separately so account-level income can subtract it again — exactly
   * mirroring `transferredIn`.
   */
  roscaIn?: number;
  updatedAt: string; // ISO string
}

export interface FundSummary {
  stability: Fund;
  growth: Fund;
  life: Fund;
  charity: Fund;
}
