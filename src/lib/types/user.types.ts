export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  selectedCurrency: string;
  selectedLanguage: 'en' | 'ar';
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserSettingsInput {
  displayName?: string;
  selectedCurrency?: string;
  selectedLanguage?: 'en' | 'ar';
}
