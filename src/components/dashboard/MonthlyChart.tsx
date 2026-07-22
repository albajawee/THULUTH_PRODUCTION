'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/formatters';
import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';
import { Income, Expense, Donation } from '@/lib/types';
import { format, eachMonthOfInterval, subMonths } from 'date-fns';

interface MonthlyChartProps {
  incomes: Income[];
  expenses: Expense[];
  /**
   * Counted in the expense line. A donation is money leaving the account exactly like an expense
   * is — it just lives in its own collection. Omitting it made this chart disagree with the
   * dashboard's Total Expenses card, which derives from the fund counters and always included it.
   */
  donations: Donation[];
}

export function MonthlyChart({ incomes, expenses, donations }: MonthlyChartProps) {
  const { currency } = useUserSettings();
  const t = useTranslations('dashboard');
  const now = new Date();
  const months = eachMonthOfInterval({
    start: subMonths(now, 5),
    end: now,
  });

  const data = months.map((month) => {
    const monthStr = format(month, 'yyyy-MM');
    const monthIncome = incomes
      .filter((i) => i.date.startsWith(monthStr))
      .reduce((s, i) => s + i.amount, 0);
    const monthExpenses =
      expenses
        .filter((e) => e.date.startsWith(monthStr))
        .reduce((s, e) => s + e.amount, 0) +
      donations
        .filter((d) => d.date.startsWith(monthStr))
        .reduce((s, d) => s + d.amount, 0);

    return {
      month: format(month, 'MMM'),
      income: monthIncome,
      expenses: monthExpenses,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{t('overview6m')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="month"
              className="text-xs"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(v) => formatCurrency(v, currency).replace(/[^0-9.KM]/g, '')}
              width={60}
            />
            <Tooltip
              formatter={(value: unknown) => formatCurrency(Number(value ?? 0), currency)}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend iconType="circle" iconSize={8} />
            <Area
              type="monotone"
              dataKey="income"
              name={t('income')}
              stroke="#34d399"
              fill="url(#incomeGrad)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="expenses"
              name={t('expenses')}
              stroke="#f87171"
              fill="url(#expGrad)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
