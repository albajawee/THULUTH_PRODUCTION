'use client';

import { useTranslations } from 'next-intl';
import { Receipt, Hash, Trophy, Scale, Flame, AlertTriangle } from 'lucide-react';
import { FundType } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/formatters';
import { buildCategorySegments } from '@/lib/utils/category-segments';
import { useAuth } from '@/lib/hooks/useAuth';
import { useExpenseStats } from '@/lib/hooks/useExpenseStats';
import { useChartPalette } from '@/lib/hooks/useChartPalette';
import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';
import { StatCard } from '@/components/dashboard/StatCard';
import { CategoryDonut } from '@/components/charts/CategoryDonut';
import { CategoryBars } from '@/components/charts/CategoryBars';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function ExpenseAnalytics({
  fundType,
  fundTotalSpent = 0,
}: {
  fundType: FundType;
  /** The fund's own spent counter, already loaded by the page. Used only to tell a genuinely
      empty fund apart from a rollup that failed to load or hasn't been backfilled. */
  fundTotalSpent?: number;
}) {
  const { user } = useAuth();
  const { stats, maxAmount, loading, error } = useExpenseStats(user?.uid ?? null, fundType);
  const { currency } = useUserSettings();
  const t = useTranslations('funds');
  const palette = useChartPalette();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  const total = stats?.totalSpent ?? 0;
  const count = stats?.count ?? 0;
  const segments = buildCategorySegments(stats?.categories ?? {}, palette, t('otherCategories'));

  // Rollup unreadable (rule not deployed) or empty against real spending (not backfilled) — say so
  // rather than implying the fund is empty. A genuinely empty fund still shows the empty state.
  if (error || (count === 0 && fundTotalSpent > 0)) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">{t('analytics')}</CardTitle></CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">{t('analyticsUnavailable')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (count === 0 || segments.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">{t('analytics')}</CardTitle></CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Receipt className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t('noExpenses')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const largest = segments[0];
  const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0);

  const metrics = [
    { label: t('totalExpenses'), value: formatCurrency(total, currency), icon: Receipt, tint: 'text-rose-400 bg-rose-500/10' },
    { label: t('transactions'), value: String(count), icon: Hash, tint: 'text-blue-400 bg-blue-500/10' },
    { label: t('largestCategory'), value: largest.name, sub: `${pct(largest.total).toFixed(0)}%`, icon: Trophy, tint: 'text-amber-400 bg-amber-500/10' },
    { label: t('avgExpense'), value: formatCurrency(count > 0 ? total / count : 0, currency), icon: Scale, tint: 'text-violet-400 bg-violet-500/10' },
    { label: t('highestExpense'), value: formatCurrency(maxAmount ?? 0, currency), icon: Flame, tint: 'text-orange-400 bg-orange-500/10' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {metrics.map((m, i) => <StatCard key={m.label} index={i} {...m} />)}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{t('categoryBreakdown')}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-8 lg:grid-cols-2 items-center">
            <CategoryDonut segments={segments} total={total} centerLabel={t('totalSpent')} />
            <CategoryBars segments={segments} total={total} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
