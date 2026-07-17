export type StabilityCategory =
  | 'rent'
  | 'loans'
  | 'utilities'
  | 'internet'
  | 'transportation'
  | 'food'
  | 'other';

export type LifeCategory =
  | 'travel'
  | 'restaurants'
  | 'clothing'
  | 'entertainment'
  | 'gifts'
  | 'other';

export type GrowthCategory =
  | 'real_estate'
  | 'business'
  | 'education'
  | 'investments'
  | 'retirement'
  | 'other';

export const STABILITY_CATEGORIES: { value: StabilityCategory; label: string }[] = [
  { value: 'rent', label: 'Rent' },
  { value: 'loans', label: 'Loans' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'internet', label: 'Internet' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'food', label: 'Food' },
  { value: 'other', label: 'Other' },
];

export const LIFE_CATEGORIES: { value: LifeCategory; label: string }[] = [
  { value: 'travel', label: 'Travel' },
  { value: 'restaurants', label: 'Restaurants' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'gifts', label: 'Gifts' },
  { value: 'other', label: 'Other' },
];

export const GROWTH_CATEGORIES: { value: GrowthCategory; label: string }[] = [
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'business', label: 'Business' },
  { value: 'education', label: 'Education' },
  { value: 'investments', label: 'Investments' },
  { value: 'retirement', label: 'Retirement' },
  { value: 'other', label: 'Other' },
];
