import { FundType } from '../types';

/**
 * Categories are user-managed freeform strings, edited per fund in Settings. These are only the
 * seed defaults used to bootstrap a new account and as a fallback for accounts that haven't
 * customised a given fund yet. They are intentionally plain strings — a category IS its label, and
 * the label is what gets stored on each expense, so deleting a category later never affects the
 * expenses that already used it.
 */
export const DEFAULT_CATEGORIES_BY_FUND: Record<FundType, string[]> = {
  stability: ['Rent', 'Loans', 'Utilities', 'Internet', 'Transportation', 'Food'],
  growth: ['Real Estate', 'Business', 'Education', 'Investments', 'Retirement'],
  life: ['Travel', 'Restaurants', 'Clothing', 'Entertainment', 'Gifts'],
  charity: ['Zakat', 'Sadaqah', 'General'],
};

/**
 * The categories to show for a fund: the user's own list when they've set one, otherwise the
 * defaults. Never returns an empty array for a known fund, so the expense pickers always have
 * something to show.
 */
export function categoriesForFund(
  userCategories: Partial<Record<FundType, string[]>> | undefined,
  fund: FundType
): string[] {
  const custom = userCategories?.[fund];
  if (custom && custom.length > 0) return custom;
  return DEFAULT_CATEGORIES_BY_FUND[fund];
}
