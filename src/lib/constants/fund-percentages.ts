import { FundType } from '../types';

/**
 * The split, in whole percentage points. Integers are the source of truth rather than the 0.33
 * fractions below, because the distribution maths has to be exact: `amount * 0.33` is subject to
 * binary floating-point error, while `amount * 33 / 100` with an integer numerator is not. The
 * points sum to 100 exactly, which is what lets a distribution add back up to the income.
 */
export const DISTRIBUTION_POINTS: Record<FundType, number> = {
  stability: 33,
  growth: 33,
  life: 33,
  charity: 1,
} as const;

export const TOTAL_POINTS = Object.values(DISTRIBUTION_POINTS).reduce((a, b) => a + b, 0);

/** The same split as fractions, for display and estimation. Derived, never edited directly. */
export const DISTRIBUTION: Record<FundType, number> = {
  stability: DISTRIBUTION_POINTS.stability / 100,
  growth: DISTRIBUTION_POINTS.growth / 100,
  life: DISTRIBUTION_POINTS.life / 100,
  charity: DISTRIBUTION_POINTS.charity / 100,
};

export const TOTAL_DISTRIBUTION = Object.values(DISTRIBUTION).reduce((a, b) => a + b, 0);
