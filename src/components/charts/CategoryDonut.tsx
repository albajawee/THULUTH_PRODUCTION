'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '@/lib/utils/formatters';
import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';
import type { CategorySegment } from '@/lib/utils/category-segments';

/** Reusable donut with a centred total. Segments carry their own colour. */
export function CategoryDonut({
  segments,
  total,
  centerLabel,
  height = 240,
}: {
  segments: CategorySegment[];
  total: number;
  centerLabel: string;
  height?: number;
}) {
  const { currency } = useUserSettings();
  const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0);

  return (
    <div className="relative mx-auto w-full max-w-[260px]">
      <ResponsiveContainer width="100%" height={height}>
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
            formatter={(value: unknown, name: unknown) => [
              `${formatCurrency(Number(value ?? 0), currency)} · ${pct(Number(value ?? 0)).toFixed(1)}%`,
              String(name),
            ]}
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
        <span className="text-xs text-muted-foreground">{centerLabel}</span>
        <span className="text-xl font-bold tabular-nums">{formatCurrency(total, currency)}</span>
      </div>
    </div>
  );
}
