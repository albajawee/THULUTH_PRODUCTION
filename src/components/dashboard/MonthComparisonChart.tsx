'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/formatters';
import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';
import type { MonthlyPoint } from '@/lib/hooks/useMonthlyAggregate';

const INCOME = '#34d399';
const SPENDING = '#f87171';

/** This month vs last: grouped income/spending bars, from the monthly aggregate. */
export function MonthComparisonChart({ series }: { series: MonthlyPoint[] }) {
  const { currency } = useUserSettings();
  const t = useTranslations('dashboard');

  const data = series.slice(-2).map((p) => {
    const [y, m] = p.month.split('-').map(Number);
    return { label: format(new Date(y, m - 1, 1), 'MMM'), income: p.income, spending: p.spending };
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base font-semibold">{t('monthComparison')}</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(v) => formatCurrency(v, currency).replace(/[^0-9.KM]/g, '')}
              width={60}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
              formatter={(value: unknown, name: unknown) => [formatCurrency(Number(value ?? 0), currency), String(name)]}
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
            />
            <Legend iconType="circle" iconSize={8} />
            <Bar dataKey="income" name={t('income')} fill={INCOME} radius={[4, 4, 0, 0]} />
            <Bar dataKey="spending" name={t('expenses')} fill={SPENDING} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
