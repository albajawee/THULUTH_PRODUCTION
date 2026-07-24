'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/formatters';
import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';
import type { MonthlyPoint } from '@/lib/hooks/useMonthlyAggregate';

const INCOME = '#34d399';   // money in
const SPENDING = '#f87171'; // money out

/** Income vs spending over the recent months, from the maintained monthly aggregate. */
export function MonthlyTrendChart({ series }: { series: MonthlyPoint[] }) {
  const { currency } = useUserSettings();
  const t = useTranslations('dashboard');

  const data = series.map((p) => {
    const [y, m] = p.month.split('-').map(Number);
    return { label: format(new Date(y, m - 1, 1), 'MMM'), income: p.income, spending: p.spending };
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base font-semibold">{t('overview6m')}</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="mtIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={INCOME} stopOpacity={0.3} />
                <stop offset="95%" stopColor={INCOME} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="mtSpending" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={SPENDING} stopOpacity={0.3} />
                <stop offset="95%" stopColor={SPENDING} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(v) => formatCurrency(v, currency).replace(/[^0-9.KM]/g, '')}
              width={60}
            />
            <Tooltip
              formatter={(value: unknown, name: unknown) => [formatCurrency(Number(value ?? 0), currency), String(name)]}
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
            />
            <Legend iconType="circle" iconSize={8} />
            <Area type="monotone" dataKey="income" name={t('income')} stroke={INCOME} fill="url(#mtIncome)" strokeWidth={2} />
            <Area type="monotone" dataKey="spending" name={t('expenses')} stroke={SPENDING} fill="url(#mtSpending)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
