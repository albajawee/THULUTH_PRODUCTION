'use client';

import { useTranslations } from 'next-intl';
import { Expense } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/formatters';
import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#60a5fa', '#34d399', '#a78bfa', '#fbbf24', '#f87171', '#94a3b8'];

interface CategoryBreakdownProps {
  expenses: Expense[];
}

export function CategoryBreakdown({ expenses }: CategoryBreakdownProps) {
  const { currency } = useUserSettings();
  const t = useTranslations('funds');
  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
  }

  const data = Object.entries(byCategory).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('categoryBreakdown')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              innerRadius={45}
            >
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
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
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
