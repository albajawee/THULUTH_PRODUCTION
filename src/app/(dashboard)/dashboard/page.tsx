'use client';

import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/hooks/useAuth';
import { useFunds } from '@/lib/hooks/useFunds';
import { useTransactions } from '@/lib/hooks/useTransactions';
import { useGoals } from '@/lib/hooks/useGoals';
import { useExpenseStatsAll } from '@/lib/hooks/useExpenseStatsAll';
import { useMonthlyAggregate } from '@/lib/hooks/useMonthlyAggregate';
import { useLargestExpense } from '@/lib/hooks/useLargestExpense';
import { FundCard } from '@/components/dashboard/FundCard';
import { SummaryBar } from '@/components/dashboard/SummaryBar';
import { ExpenseInsights } from '@/components/dashboard/ExpenseInsights';
import { CategoryOverview } from '@/components/dashboard/CategoryOverview';
import { MonthlyTrendChart } from '@/components/dashboard/MonthlyTrendChart';
import { MonthComparisonChart } from '@/components/dashboard/MonthComparisonChart';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { ActiveGoals } from '@/components/dashboard/ActiveGoals';
import { FUND_ORDER } from '@/lib/constants/fund-config';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Dashboard — a constant-time financial overview.
 *
 * Every widget reads a maintained aggregate (funds, expense_stats, the monthly rollup) or a single
 * bounded query (largest expense, recent transactions). Nothing scans the expenses/incomes/
 * donations collections, so the page cost is flat no matter how much history exists.
 */
export default function DashboardPage() {
  const { user } = useAuth();
  const t = useTranslations('dashboard');

  const { funds, loading: fundsLoading, totalBalance, totalReceived, totalSpent, totalTransferredIn } =
    useFunds(user?.uid ?? null);
  const { combined } = useExpenseStatsAll(user?.uid ?? null);
  const { series } = useMonthlyAggregate(user?.uid ?? null, 6);
  const { expense: largestExpense } = useLargestExpense(user?.uid ?? null);
  const { transactions } = useTransactions(user?.uid ?? null, 10);
  const { activeGoals } = useGoals(user?.uid ?? null);

  // Transfers are already excluded from totalSpent (they go to transferredOut). Receipts still need
  // it: a transfer genuinely lands in a fund's totalReceived, but at account level that money is
  // not new income — it already existed elsewhere. Clamped so drifted data can't show negative.
  const totalIncome = Math.max(0, totalReceived - totalTransferredIn);
  const totalExpenses = totalSpent;

  if (fundsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
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

      <SummaryBar totalBalance={totalBalance} totalIncome={totalIncome} totalExpenses={totalExpenses} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {FUND_ORDER.map((fundId, i) => {
          const fund = funds?.[fundId];
          if (!fund) return <Skeleton key={fundId} className="h-40 rounded-xl" />;
          return <FundCard key={fundId} fund={fund} index={i} />;
        })}
      </div>

      {combined && <ExpenseInsights combined={combined} largestExpense={largestExpense} series={series} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyTrendChart series={series} />
        {combined && <CategoryOverview combined={combined} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthComparisonChart series={series} />
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
