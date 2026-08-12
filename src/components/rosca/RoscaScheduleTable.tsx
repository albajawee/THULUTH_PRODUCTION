'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { markRoscaContribution, reverseRoscaEntry } from '@/lib/services/rosca.service';
import { formatCurrency, formatDate, toInputDate } from '@/lib/utils/formatters';
import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';
import { RoscaSchedule, RoscaRound } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Undo2, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<RoscaRound['status'], string> = {
  historical: 'text-muted-foreground border-border/50',
  paid: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  due: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  overdue: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
  upcoming: 'text-muted-foreground border-border/50',
};

export function RoscaScheduleTable({ schedule }: { schedule: RoscaSchedule }) {
  const { currency } = useUserSettings();
  const t = useTranslations('rosca');
  const [pending, setPending] = useState<number | null>(null);

  const { group, rounds } = schedule;

  async function handleMark(round: number) {
    setPending(round);
    const result = await markRoscaContribution({
      groupId: group.id,
      round,
      date: toInputDate(),
    });
    setPending(null);
    if (result.success) {
      toast.success(t('markedToast', { round }));
    } else {
      const err = result.error as Record<string, string[] | undefined> | undefined;
      toast.error(err?.round?.[0] ?? err?.amount?.[0] ?? t('markFailedToast'));
    }
  }

  async function handleUndo(entryId: string) {
    const result = await reverseRoscaEntry({ entryId });
    if (result.success) toast.success(t('undoneToast'));
    else toast.error(typeof result.error === 'string' ? result.error : t('undoFailedToast'));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('schedule')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('scheduleDesc')}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {rounds.map((r) => {
            const isHistorical = r.status === 'historical';
            return (
              <div
                key={r.round}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-3',
                  STATUS_STYLES[r.status],
                  isHistorical && 'opacity-60'
                )}
              >
                <span className="text-sm font-semibold tabular-nums w-16 shrink-0">
                  {t('roundLabel', { round: r.round })}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    {t('dueOn', { date: formatDate(r.dueDate) })}
                    {r.contribution && ` · ${t('paidOn', { date: formatDate(r.contribution.date) })}`}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-xs">{t(`status_${r.status}`)}</Badge>
                    {r.isPayoutRound && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Trophy className="h-3 w-3" />
                        {t('yourTurn')}
                      </Badge>
                    )}
                    {r.payout && (
                      <span className="text-xs font-semibold text-indigo-400">
                        +{formatCurrency(r.payout.amount, currency)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Historical rounds were settled before tracking began — there is nothing here to
                    mark or undo, and offering it would move money that already moved long ago. */}
                {isHistorical ? (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {t('historicalRoundHint')}
                  </span>
                ) : r.contribution ? (
                  <ConfirmDialog
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        aria-label={t('undo')}
                      >
                        <Undo2 className="h-4 w-4" />
                      </Button>
                    }
                    title={t('undoTitle')}
                    description={t('undoContributionDesc', {
                      amount: formatCurrency(r.contribution.amount, currency),
                      fund: group.fundType,
                      round: r.round,
                    })}
                    confirmLabel={t('undo')}
                    destructive
                    onConfirm={() => handleUndo(r.contribution!.id)}
                  />
                ) : group.status === 'active' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    disabled={pending !== null}
                    onClick={() => handleMark(r.round)}
                  >
                    <Check className="mr-1.5 h-4 w-4" />
                    {pending === r.round ? t('marking') : t('markPaid')}
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
