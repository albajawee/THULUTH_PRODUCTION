'use client';

import { useTranslations } from 'next-intl';
import { PieChartIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryDonut } from '@/components/charts/CategoryDonut';
import { CategoryBars } from '@/components/charts/CategoryBars';
import { useChartPalette } from '@/lib/hooks/useChartPalette';
import { buildCategorySegments } from '@/lib/utils/category-segments';
import type { CombinedExpenseStats } from '@/lib/hooks/useExpenseStatsAll';

/**
 * Account-wide category distribution: combined-fund donut + top categories, from the merged
 * expense_stats rollups. Shows the top 5 so the dashboard stays a headline view.
 */
export function CategoryOverview({ combined }: { combined: CombinedExpenseStats }) {
  const t = useTranslations('dashboard');
  const palette = useChartPalette();
  const segments = buildCategorySegments(combined.categories, palette, t('otherCategories'), 5);
  const total = combined.totalSpent;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base font-semibold">{t('topCategories')}</CardTitle></CardHeader>
      <CardContent>
        {segments.length === 0 ? (
          <div className="text-center py-10">
            <PieChartIcon className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t('noExpenseData')}</p>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2 items-center">
            <CategoryDonut segments={segments} total={total} centerLabel={t('spent')} />
            <CategoryBars segments={segments} total={total} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
