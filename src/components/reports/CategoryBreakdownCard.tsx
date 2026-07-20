'use client';

import { useTranslations } from 'next-intl';
import { CategoryStat } from '@/lib/services/reports.service';
import { formatCurrency } from '@/lib/utils/formatters';
import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const BAR_COLOR: Record<string, string> = {
  stability: 'bg-blue-500',
  growth: 'bg-emerald-500',
  life: 'bg-violet-500',
  charity: 'bg-amber-500',
};

export function CategoryBreakdownCard({ categories }: { categories: CategoryStat[] }) {
  const { currency } = useUserSettings();
  const t = useTranslations('reports');
  const tf = useTranslations('nav');
  const max = categories.length > 0 ? categories[0].total : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('whereMoneyWent')}</CardTitle>
        <p className="text-xs text-muted-foreground">{t('whereMoneyWentDesc')}</p>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t('noExpenses')}</p>
        ) : (
          <div className="space-y-3">
            {categories.map((c) => {
              return (
                <div key={`${c.fund}:${c.category}`}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className={cn('h-2 w-2 shrink-0 rounded-full', BAR_COLOR[c.fund])} />
                      <span className="capitalize truncate">{c.category}</span>
                      <span className="text-xs text-muted-foreground shrink-0">· {tf(c.fund)}</span>
                    </span>
                    <span className="font-semibold tabular-nums shrink-0">
                      {formatCurrency(c.total, currency)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn('h-full rounded-full', BAR_COLOR[c.fund])}
                        style={{ width: `${max > 0 ? (c.total / max) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
                      {Math.round(c.share)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
