'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './useAuth';

interface UserSettingsContextType {
  currency: string;
  language: string;
}

const UserSettingsContext = createContext<UserSettingsContextType>({
  currency: 'SAR',
  language: 'en',
});

export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currency, setCurrency] = useState('SAR');
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.selectedCurrency) setCurrency(data.selectedCurrency);
        if (data.selectedLanguage) setLanguage(data.selectedLanguage);
      }
    });
    return unsub;
  }, [user]);

  return (
    <UserSettingsContext.Provider value={{ currency, language }}>
      {children}
    </UserSettingsContext.Provider>
  );
}

export function useUserSettings() {
  return useContext(UserSettingsContext);
}
