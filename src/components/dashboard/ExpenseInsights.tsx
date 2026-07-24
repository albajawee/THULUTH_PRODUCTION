'use client';

import { useTranslations } from 'next-intl';
import { Receipt, Hash, Scale, Flame, Trophy, Activity } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { formatCurrency } from '@/lib/utils/formatters';
import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';
import type { CombinedExpenseStats } from '@/lib/hooks/useExpenseStatsAll';
import type { MonthlyPoint } from '@/lib/hooks/useMonthlyAggregate';
import type { Expense } from '@/lib/types';

/**
 * Account-wide expense insights, all from constant-time aggregates (combined expense_stats + the
 * monthly rollup + the single largest-expense read). Expense-scoped: donations aren't categorised
 * expenses, so they're excluded here even though they count toward the top "Total Spending" card.
 */
export function ExpenseInsights({
  combined,
  largestExpense,
  series,
}: {
  combined: CombinedExpenseStats;
  largestExpense: Expense | null;
  series: MonthlyPoint[];
}) {
  const { currency } = useUserSettings();
  const t = useTranslations('dashboard');

  const total = combined.totalSpent;
  const count = combined.count;
  const avg = count > 0 ? total / count : 0;

  const cats = Object.entries(combined.categories);
  const byCount = cats.slice().sort((a, b) => b[1].count - a[1].count)[0];
  const mostActive = byCount ? { name: byCount[0], count: byCount[1].count } : null;

  // Growth vs previous month from the last two points of the trend window.
  const thisMonth = series[series.length - 1]?.spending ?? 0;
  const lastMonth = series[series.length - 2]?.spending ?? 0;
  const growthPct = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : null;
  const delta =
    growthPct === null
      ? undefined
      : {
          text: `${growthPct > 0 ? '+' : ''}${growthPct.toFixed(0)}%`,
          tone: (growthPct > 0.5 ? 'up' : growthPct < -0.5 ? 'down' : 'flat') as 'up' | 'down' | 'flat',
        };

  const cards = [
    { label: t('totalExpenses'), value: formatCurrency(total, currency), icon: Receipt, tint: 'text-rose-400 bg-rose-500/10' },
    { label: t('transactions'), value: String(count), icon: Hash, tint: 'text-blue-400 bg-blue-500/10' },
    { label: t('avgExpense'), value: formatCurrency(avg, currency), icon: Scale, tint: 'text-violet-400 bg-violet-500/10' },
    {
      label: t('largestExpense'),
      value: formatCurrency(largestExpense?.amount ?? 0, currency),
      sub: largestExpense?.category,
      icon: Flame,
      tint: 'text-orange-400 bg-orange-500/10',
    },
    mostActive
      ? { label: t('mostActive'), value: mostActive.name, sub: t('nTransactions', { count: mostActive.count }), icon: Activity, tint: 'text-emerald-400 bg-emerald-500/10' }
      : { label: t('mostActive'), value: '—', icon: Activity, tint: 'text-emerald-400 bg-emerald-500/10' },
    { label: t('thisMonthSpending'), value: formatCurrency(thisMonth, currency), sub: t('vsLastMonth'), icon: Trophy, tint: 'text-amber-400 bg-amber-500/10', delta },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((c, i) => <StatCard key={c.label} index={i} {...c} />)}
    </div>
  );
}
