import { FundType } from './fund.types';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  selectedCurrency: string;
  selectedLanguage: 'en' | 'ar';
  /**
   * Round income shares to the currency's smallest real banknote (250 for IQD) instead of to
   * single units. Only has an effect for currencies that declare a note base in
   * `constants/currency`. Optional because profiles created before this setting existed don't
   * carry it — read it through `noteBaseFor`, which treats absent as on.
   */
  roundToNoteBase?: boolean;
  /**
   * Show the ROSCA (rotating savings group) feature. Off by default and **absent means off** — the
   * opposite polarity to `roundToNoteBase` above, so every read of this field is `=== true`, never
   * `!== false`. Most users have no such arrangement and shouldn't see the feature at all.
   */
  roscaEnabled?: boolean;
  /** User-managed expense categories per fund. Absent/empty for a fund falls back to defaults. */
  categories?: Partial<Record<FundType, string[]>>;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserSettingsInput {
  displayName?: string;
  selectedCurrency?: string;
  selectedLanguage?: 'en' | 'ar';
  roundToNoteBase?: boolean;
  roscaEnabled?: boolean;
}
