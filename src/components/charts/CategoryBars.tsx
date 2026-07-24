'use client';

import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/utils/formatters';
import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';
import type { CategorySegment } from '@/lib/utils/category-segments';

/**
 * Reusable ranked horizontal bars. Doubles as the chart legend — each row directly labels its
 * category with name, total and share, which is also what satisfies the light-mode contrast rule
 * for the shared palette.
 */
export function CategoryBars({ segments, total }: { segments: CategorySegment[]; total: number }) {
  const { currency } = useUserSettings();
  const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0);

  return (
    <div className="space-y-3">
      {segments.map((s, i) => {
        const p = pct(s.total);
        const Icon = s.icon;
        return (
          <div key={s.name}>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="inline-flex h-6 w-6 items-center justify-center rounded-md shrink-0"
                style={{ backgroundColor: `${s.color}22` }}
              >
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
  );
}
