'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './useAuth';
import { FundType } from '../types';
import { categoriesForFund, DEFAULT_CATEGORIES_BY_FUND } from '../constants/fund-categories';
import { DEFAULT_CURRENCY } from '../constants/currency';

interface UserSettingsContextType {
  currency: string;
  language: string;
  /** Round income shares to the currency's smallest banknote. Meaningless for currencies with no
   *  note base; pass it to `noteBaseFor` rather than branching on it directly. */
  roundToNoteBase: boolean;
  /** Show the ROSCA feature. Off unless explicitly enabled — note the inverted polarity. */
  roscaEnabled: boolean;
  /** Resolved categories per fund (user's own list, or defaults when unset). Always populated. */
  categories: Record<FundType, string[]>;
}

const UserSettingsContext = createContext<UserSettingsContextType>({
  currency: DEFAULT_CURRENCY,
  language: 'en',
  roundToNoteBase: true,
  roscaEnabled: false,
  categories: DEFAULT_CATEGORIES_BY_FUND,
});

export function UserSettingsProvider({
  children,
  initialCurrency = DEFAULT_CURRENCY,
  initialRoundToNoteBase = true,
  initialRoscaEnabled = false,
}: {
  children: ReactNode;
  initialCurrency?: string;
  initialRoundToNoteBase?: boolean;
  initialRoscaEnabled?: boolean;
}) {
  const { user } = useAuth();
  // Seeded from the server-read `currency` cookie so first paint matches the saved currency (no
  // flash). The Firestore snapshot below stays the source of truth and corrects it if they differ.
  const [currency, setCurrency] = useState(initialCurrency);
  const [language, setLanguage] = useState('en');
  const [roundToNoteBase, setRoundToNoteBase] = useState(initialRoundToNoteBase);
  const [roscaEnabled, setRoscaEnabled] = useState(initialRoscaEnabled);
  const [categories, setCategories] = useState<Record<FundType, string[]>>(DEFAULT_CATEGORIES_BY_FUND);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (data.selectedCurrency) setCurrency(data.selectedCurrency);
        if (data.selectedLanguage) setLanguage(data.selectedLanguage);
        // Absent means "never chosen" for profiles predating this setting, which is on.
        setRoundToNoteBase(data.roundToNoteBase !== false);
        // Inverted: this one is off unless explicitly enabled, so absent must read as false.
        setRoscaEnabled(data.roscaEnabled === true);
        const stored = data.categories as Partial<Record<FundType, string[]>> | undefined;
        setCategories({
          stability: categoriesForFund(stored, 'stability'),
          growth: categoriesForFund(stored, 'growth'),
          life: categoriesForFund(stored, 'life'),
          charity: categoriesForFund(stored, 'charity'),
        });
      },
      // If this listener dies the values simply stay as seeded from the cookie, which is the last
      // saved state — never a hard 'SAR' fallback that contradicts what the user picked.
      () => {}
    );
    return unsub;
  }, [user]);

  return (
    <UserSettingsContext.Provider
      value={{ currency, language, roundToNoteBase, roscaEnabled, categories }}
    >
      {children}
    </UserSettingsContext.Provider>
  );
}

export function useUserSettings() {
  return useContext(UserSettingsContext);
}
