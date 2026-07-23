'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Receipt, Hash, Trophy, Scale, Flame, Tag, AlertTriangle, type LucideIcon } from 'lucide-react';
import { FundType } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/formatters';
import { iconForCategory } from '@/lib/utils/category-icons';
import { useAuth } from '@/lib/hooks/useAuth';
import { useExpenseStats } from '@/lib/hooks/useExpenseStats';
import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Validated categorical order (dataviz skill; validator passes both modes). Assigned by rank;
// the tail past six folds into a neutral "Other" so hues are never cycled.
const CAT_DARK = ['#3987e5', '#008300', '#d55181', '#c98500', '#199e70', '#d95926'];
const CAT_LIGHT = ['#2a78d6', '#008300', '#e87ba4', '#eda100', '#1baf7a', '#eb6834'];
const OTHER = '#898781';
const TOP_N = 6;

interface Segment {
  name: string;
  total: number;
  count: number;
  color: string;
  icon: LucideIcon;
}

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
  const { resolvedTheme } = useTheme();

  // Avoid a hydration flip: render the default (dark) palette until the client theme is known.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = !mounted || resolvedTheme !== 'light';
  const palette = dark ? CAT_DARK : CAT_LIGHT;

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

  const ranked = stats
    ? Object.entries(stats.categories)
        .filter(([, v]) => v.total > 0)
        .sort((a, b) => b[1].total - a[1].total)
    : [];

  // The rollup couldn't be read (rule not deployed), or it reads empty while the fund clearly has
  // spending (not yet backfilled). Either way it is NOT "no expenses" — say so honestly instead of
  // implying the fund is empty. A genuinely empty fund (fundTotalSpent === 0) still shows below.
  if (error || (count === 0 && fundTotalSpent > 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('analytics')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">{t('analyticsUnavailable')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (count === 0 || ranked.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('analytics')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Receipt className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t('noExpenses')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const top = ranked.slice(0, TOP_N);
  const rest = ranked.slice(TOP_N);
  const segments: Segment[] = top.map(([name, v], i) => ({
    name,
    total: v.total,
    count: v.count,
    color: palette[i % palette.length],
    icon: iconForCategory(name),
  }));
  if (rest.length > 0) {
    segments.push({
      name: t('otherCategories'),
      total: rest.reduce((s, [, v]) => s + v.total, 0),
      count: rest.reduce((s, [, v]) => s + v.count, 0),
      color: OTHER,
      icon: Tag,
    });
  }

  const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0);
  const [largestName, largestAgg] = ranked[0];

  const metrics: { label: string; value: string; sub?: string; icon: LucideIcon; tint: string }[] = [
    { label: t('totalExpenses'), value: formatCurrency(total, currency), icon: Receipt, tint: 'text-rose-400 bg-rose-500/10' },
    { label: t('transactions'), value: String(count), icon: Hash, tint: 'text-blue-400 bg-blue-500/10' },
    { label: t('largestCategory'), value: largestName, sub: `${pct(largestAgg.total).toFixed(0)}%`, icon: Trophy, tint: 'text-amber-400 bg-amber-500/10' },
    { label: t('avgExpense'), value: formatCurrency(count > 0 ? total / count : 0, currency), icon: Scale, tint: 'text-violet-400 bg-violet-500/10' },
    { label: t('highestExpense'), value: formatCurrency(maxAmount ?? 0, currency), icon: Flame, tint: 'text-orange-400 bg-orange-500/10' },
  ];

  return (
    <div className="space-y-4">
      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
          >
            <Card className="h-full">
              <CardContent className="pt-5">
                <div className={cn('inline-flex p-2 rounded-lg mb-3', m.tint.split(' ')[1])}>
                  <m.icon className={cn('h-4 w-4', m.tint.split(' ')[0])} />
                </div>
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="text-lg font-bold truncate" title={m.value}>{m.value}</p>
                {m.sub && <p className="text-xs text-muted-foreground mt-0.5">{m.sub}</p>}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('categoryBreakdown')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-8 lg:grid-cols-2 items-center">
            {/* Donut with centred total */}
            <div className="relative mx-auto w-full max-w-[260px]">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={segments}
                    dataKey="total"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={68}
                    outerRadius={96}
                    paddingAngle={2}
                    stroke="none"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {segments.map((s) => <Cell key={s.name} fill={s.color} />)}
                  </Pie>
                  <Tooltip
                    formatter={(value: unknown, name: unknown) =>
                      [`${formatCurrency(Number(value ?? 0), currency)} · ${pct(Number(value ?? 0)).toFixed(1)}%`, String(name)]
                    }
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-muted-foreground">{t('totalSpent')}</span>
                <span className="text-xl font-bold tabular-nums">{formatCurrency(total, currency)}</span>
              </div>
            </div>

            {/* Ranked bars — also the legend, with direct labels (name, total, %) */}
            <div className="space-y-3">
              {segments.map((s, i) => {
                const p = pct(s.total);
                const Icon = s.icon;
                return (
                  <div key={s.name}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md shrink-0" style={{ backgroundColor: `${s.color}22` }}>
                        <Icon className="h-3.5 w-3.5" style={{ color: s.color }} />
                      </span>
                      <span className="text-sm font-medium capitalize truncate flex-1">{s.name}</span>
                      <span className="text-sm font-semibold tabular-nums">{formatCurrency(s.total, currency)}</span>
                      <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">{p.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: s.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${p}%` }}
                        transition={{ delay: 0.1 + i * 0.06, duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
