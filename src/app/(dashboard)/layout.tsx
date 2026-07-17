import { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { DashboardShell } from '@/components/layout/DashboardShell';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Read the last-saved currency server-side so the first paint already shows it. Without this the
  // provider starts at the SAR default and flips to the real currency once the Firestore snapshot
  // arrives — a visible flash on every refresh.
  const initialCurrency = (await cookies()).get('currency')?.value ?? 'SAR';

  return <DashboardShell initialCurrency={initialCurrency}>{children}</DashboardShell>;
}
