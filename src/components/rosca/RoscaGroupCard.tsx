'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';
import { RoscaSchedule } from '@/lib/types';
import { FUND_CONFIG } from '@/lib/constants/fund-config';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export function RoscaGroupCard({ schedule }: { schedule: RoscaSchedule }) {
  const { currency } = useUserSettings();
  const t = useTranslations('rosca');
  const tf = useTranslations('nav');

  const { group, paidCount, nextDue, overdueCount, net, cycleComplete } = schedule;
  const config = FUND_CONFIG[group.fundType];
  const Icon = config.icon;

  // Rounds this app is responsible for — historical ones are already settled.
  const trackedRounds = Math.max(1, group.memberCount - group.joinedAtRound + 1);
  const progress = Math.min(100, Math.round((paidCount / trackedRounds) * 100));

  return (
    <Link href={`/rosca/${group.id}`}>
      <Card className="transition-colors hover:bg-muted/40">
        <CardContent className="pt-5">
          <div className="flex items-start gap-3">
            <div className={cn('rounded-md p-2', config.bgColor)}>
              <Icon className={cn('h-4 w-4', config.color)} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{group.name}</p>
              <p className="text-xs text-muted-foreground">
                {t('perMonthMembers', {
                  amount: formatCurrency(group.contributionAmount, currency),
                  count: group.memberCount,
                  fund: tf(group.fundType),
                })}
              </p>
            </div>
            {group.status !== 'active' && (
              <Badge variant="outline" className="shrink-0 text-xs">
                {t(`groupStatus_${group.status}`)}
              </Badge>
            )}
          </div>

          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t('roundsPaid', { paid: paidCount, total: trackedRounds })}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {cycleComplete ? (
              <Badge variant="outline" className="text-emerald-400">{t('cycleComplete')}</Badge>
            ) : overdueCount > 0 ? (
              <Badge variant="outline" className="text-rose-400">
                {t('overdueCount', { count: overdueCount })}
              </Badge>
            ) : nextDue ? (
              <span className="text-muted-foreground">
                {t('nextDue', { date: formatDate(nextDue.dueDate) })}
              </span>
            ) : null}

            <span className={cn('ml-auto font-semibold', net >= 0 ? 'text-emerald-400' : 'text-amber-400')}>
              {net >= 0 ? '+' : ''}{formatCurrency(net, currency)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
