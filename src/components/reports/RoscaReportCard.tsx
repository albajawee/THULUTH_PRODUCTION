'use client';

import { useTranslations } from 'next-intl';
import { formatCurrency } from '@/lib/utils/formatters';
import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoscaReportCardProps {
  contributed: number;
  received: number;
  net: number;
}

/**
 * ROSCA flow for the period, kept clear of the headline tiles.
 *
 * It is not a fifth tile beside Income / Expenses / Net Savings on purpose: putting it there would
 * claim the equivalence this whole feature exists to deny, and the tiles grid is four-wide so a
 * fifth would orphan-wrap anyway.
 */
export function RoscaReportCard({ contributed, received, net }: RoscaReportCardProps) {
  const { currency } = useUserSettings();
  const t = useTranslations('reports');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-indigo-400" />
          {t('roscaTitle')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t('roscaDesc')}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">{t('roscaPaid')}</p>
            <p className="text-xl font-bold text-rose-400">
              {formatCurrency(contributed, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('roscaReceived')}</p>
            <p className="text-xl font-bold text-emerald-400">
              {formatCurrency(received, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('roscaNet')}</p>
            <p className={cn('text-xl font-bold', net >= 0 ? 'text-emerald-400' : 'text-amber-400')}>
              {net >= 0 ? '+' : ''}{formatCurrency(net, currency)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
