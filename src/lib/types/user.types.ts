import { FundType } from './fund.types';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  selectedCurrency: string;
  selectedLanguage: 'en' | 'ar';
  /** User-managed expense categories per fund. Absent/empty for a fund falls back to defaults. */
  categories?: Partial<Record<FundType, string[]>>;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserSettingsInput {
  displayName?: string;
  selectedCurrency?: string;
  selectedLanguage?: 'en' | 'ar';
}
