'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './useAuth';
import { FundType } from '../types';
import { categoriesForFund, DEFAULT_CATEGORIES_BY_FUND } from '../constants/fund-categories';

interface UserSettingsContextType {
  currency: string;
  language: string;
  /** Resolved categories per fund (user's own list, or defaults when unset). Always populated. */
  categories: Record<FundType, string[]>;
}

const UserSettingsContext = createContext<UserSettingsContextType>({
  currency: 'SAR',
  language: 'en',
  categories: DEFAULT_CATEGORIES_BY_FUND,
});

export function UserSettingsProvider({
  children,
  initialCurrency = 'SAR',
}: {
  children: ReactNode;
  initialCurrency?: string;
}) {
  const { user } = useAuth();
  // Seeded from the server-read `currency` cookie so first paint matches the saved currency (no
  // flash). The Firestore snapshot below stays the source of truth and corrects it if they differ.
  const [currency, setCurrency] = useState(initialCurrency);
  const [language, setLanguage] = useState('en');
  const [categories, setCategories] = useState<Record<FundType, string[]>>(DEFAULT_CATEGORIES_BY_FUND);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.selectedCurrency) setCurrency(data.selectedCurrency);
        if (data.selectedLanguage) setLanguage(data.selectedLanguage);
        const stored = data.categories as Partial<Record<FundType, string[]>> | undefined;
        setCategories({
          stability: categoriesForFund(stored, 'stability'),
          growth: categoriesForFund(stored, 'growth'),
          life: categoriesForFund(stored, 'life'),
          charity: categoriesForFund(stored, 'charity'),
        });
      }
    });
    return unsub;
  }, [user]);

  return (
    <UserSettingsContext.Provider value={{ currency, language, categories }}>
      {children}
    </UserSettingsContext.Provider>
  );
}

export function useUserSettings() {
  return useContext(UserSettingsContext);
}
