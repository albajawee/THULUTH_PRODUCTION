import { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { DEFAULT_CURRENCY } from '@/lib/constants/currency';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Read the last-saved preferences server-side so the first paint already shows them. Without this
  // the provider starts at the defaults and flips to the real values once the Firestore snapshot
  // arrives — a visible flash on every refresh.
  const jar = await cookies();
  const initialCurrency = jar.get('currency')?.value ?? DEFAULT_CURRENCY;
  // Only an explicit 'false' turns it off; no cookie means the setting was never changed, and the
  // default is on.
  const initialRoundToNoteBase = jar.get('noteBase')?.value !== 'false';
  // Opposite polarity to the line above: this feature is off unless explicitly turned on, so only
  // an explicit 'true' enables it and a missing cookie means off.
  const initialRoscaEnabled = jar.get('rosca')?.value === 'true';

  return (
    <DashboardShell
      initialCurrency={initialCurrency}
      initialRoundToNoteBase={initialRoundToNoteBase}
      initialRoscaEnabled={initialRoscaEnabled}
    >
      {children}
    </DashboardShell>
  );
}
