'use client';

import { useTranslations } from 'next-intl';
import { formatCurrency } from '@/lib/utils/formatters';
import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';
import { RoscaSchedule } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * The user's position in one group.
 *
 * When part of the history predates tracking, the paid/received figures are annotated to say so.
 * Without that note these totals silently disagree with the fund page's "Paid to ROSCA" tile, which
 * only ever counts money this app actually moved — and a user comparing the two would be right to
 * think one of them was broken.
 */
export function RoscaPositionCard({ schedule }: { schedule: RoscaSchedule }) {
  const { currency } = useUserSettings();
  const t = useTranslations('rosca');

  const { paidTotal, receivedTotal, net, group, remainingTotal, remainingCount } = schedule;

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">{t('paidSoFar')}</p>
            <p className="text-xl font-bold text-rose-400">{formatCurrency(paidTotal, currency)}</p>
            {schedule.hasPriorPosition && group.priorContributed > 0 && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('ofWhichPrior', { amount: formatCurrency(group.priorContributed, currency) })}
              </p>
            )}
          </div>

          <div>
            <p className="text-xs text-muted-foreground">{t('received')}</p>
            <p className="text-xl font-bold text-emerald-400">
              {formatCurrency(receivedTotal, currency)}
            </p>
            {schedule.hasPriorPosition && group.priorReceived > 0 && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('ofWhichPrior', { amount: formatCurrency(group.priorReceived, currency) })}
              </p>
            )}
          </div>

          <div>
            <p className="text-xs text-muted-foreground">{t('netPosition')}</p>
            <p className={cn('text-xl font-bold', net >= 0 ? 'text-emerald-400' : 'text-amber-400')}>
              {net >= 0 ? '+' : ''}{formatCurrency(net, currency)}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">{t('remaining')}</p>
            <p className="text-xl font-bold">{formatCurrency(remainingTotal, currency)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('remainingRounds', { count: remainingCount })}
            </p>
          </div>
        </div>

        <p className="mt-4 border-t border-border/50 pt-3 text-xs text-muted-foreground">
          {t('netPositionDesc')}
        </p>
      </CardContent>
    </Card>
  );
}
