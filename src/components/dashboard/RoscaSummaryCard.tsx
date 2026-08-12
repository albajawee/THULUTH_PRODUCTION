'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRoscaOverview } from '@/lib/hooks/useRosca';
import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Account-wide ROSCA position. Rendered only when the feature is on — the dashboard page gates it,
 * matching how the expense widgets are gated on their data being present.
 */
export function RoscaSummaryCard() {
  const { user } = useAuth();
  const { currency } = useUserSettings();
  const { overview, loading } = useRoscaOverview(user?.uid ?? null);
  const t = useTranslations('rosca');

  if (loading) return null;

  const active = overview.schedules.filter((s) => s.group.status === 'active');

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Users className="h-4 w-4 text-indigo-400" />
          {t('title')}
        </CardTitle>
        <Link href="/rosca" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          {t('viewAll')}
        </Link>
      </CardHeader>
      <CardContent>
        {active.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t('dashboardEmpty')}</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">{t('monthlyCommitment')}</p>
                <p className="text-lg font-bold">
                  {formatCurrency(overview.monthlyCommitment, currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('paidSoFar')}</p>
                <p className="text-lg font-bold text-rose-400">
                  {formatCurrency(overview.paidTotal, currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('netPosition')}</p>
                <p className={cn(
                  'text-lg font-bold',
                  overview.net >= 0 ? 'text-emerald-400' : 'text-amber-400'
                )}>
                  {overview.net >= 0 ? '+' : ''}{formatCurrency(overview.net, currency)}
                </p>
              </div>
            </div>

            <div className="space-y-2 border-t border-border/50 pt-3">
              {active.slice(0, 3).map((s) => (
                <Link
                  key={s.group.id}
                  href={`/rosca/${s.group.id}`}
                  className="flex items-center gap-2 text-sm hover:text-foreground"
                >
                  <span className="min-w-0 flex-1 truncate">{s.group.name}</span>
                  {s.overdueCount > 0 ? (
                    <Badge variant="outline" className="text-xs text-rose-400">
                      {t('overdueCount', { count: s.overdueCount })}
                    </Badge>
                  ) : s.nextDue ? (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {t('nextDue', { date: formatDate(s.nextDue.dueDate) })}
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs text-emerald-400">{t('cycleComplete')}</span>
                  )}
                </Link>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">{t('notCountedNote')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
