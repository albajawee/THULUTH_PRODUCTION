'use client';

import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/hooks/useAuth';
import { useFunds } from '@/lib/hooks/useFunds';
import { useTransferTotal } from '@/lib/hooks/useTransferTotal';
import { useTransactions } from '@/lib/hooks/useTransactions';
import { useGoals } from '@/lib/hooks/useGoals';
import { useIncome } from '@/lib/hooks/useIncome';
import { useExpenses } from '@/lib/hooks/useExpenses';
import { FundCard } from '@/components/dashboard/FundCard';
import { SummaryBar } from '@/components/dashboard/SummaryBar';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { ActiveGoals } from '@/components/dashboard/ActiveGoals';
import { MonthlyChart } from '@/components/dashboard/MonthlyChart';
import { FUND_ORDER } from '@/lib/constants/fund-config';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { user } = useAuth();
  const t = useTranslations('dashboard');
  const { funds, loading: fundsLoading, totalBalance, totalReceived, totalSpent } = useFunds(user?.uid ?? null);
  const { totalTransferred } = useTransferTotal(user?.uid ?? null);
  const { transactions, loading: txLoading } = useTransactions(user?.uid ?? null, 10);
  const { activeGoals } = useGoals(user?.uid ?? null);
  const { incomes } = useIncome(user?.uid ?? null, 100);
  const { expenses } = useExpenses(user?.uid ?? null, undefined, 100);

  // The fund counters track money in/out of each fund, so moving money between funds shows up in
  // both — correct per fund, but it makes an internal move look like income AND an expense once
  // summed across all four. These headline figures are account-level, so the transfers come back
  // out. Clamped at zero: a negative "total income" from drifted data would read as a far more
  // alarming bug than the small inaccuracy it would be reporting.
  const totalIncome = Math.max(0, totalReceived - totalTransferred);
  const totalExpenses = Math.max(0, totalSpent - totalTransferred);

  if (fundsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">
          {t('welcome')}{user?.displayName ? `, ${user.displayName}` : ''}
        </p>
      </div>

      <SummaryBar
        totalBalance={totalBalance}
        totalIncome={totalIncome}
        totalExpenses={totalExpenses}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {FUND_ORDER.map((fundId, i) => {
          const fund = funds?.[fundId];
          if (!fund) return <Skeleton key={fundId} className="h-40 rounded-xl" />;
          return <FundCard key={fundId} fund={fund} index={i} />;
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyChart incomes={incomes} expenses={expenses} />
        <ActiveGoals
          goals={activeGoals}
          fundBalances={{
            stability: funds?.stability?.balance ?? 0,
            growth: funds?.growth?.balance ?? 0,
            life: funds?.life?.balance ?? 0,
            charity: funds?.charity?.balance ?? 0,
          }}
        />
      </div>

      <RecentTransactions transactions={transactions} />
    </div>
  );
}
