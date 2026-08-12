'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRoscaGroup } from '@/lib/hooks/useRosca';
import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';
import {
  recordRoscaPayout, setRoscaPayoutRound, setRoscaStatus, reverseRoscaEntry,
} from '@/lib/services/rosca.service';
import { formatCurrency, toInputDate } from '@/lib/utils/formatters';
import { RoscaPositionCard } from '@/components/rosca/RoscaPositionCard';
import { RoscaScheduleTable } from '@/components/rosca/RoscaScheduleTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MoneyInput } from '@/components/ui/money-input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Undo2 } from 'lucide-react';

export default function RoscaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { currency } = useUserSettings();
  const { group, schedule, loading } = useRoscaGroup(user?.uid ?? null, id);
  const t = useTranslations('rosca');

  const [turnInput, setTurnInput] = useState('');
  const [payoutAmount, setPayoutAmount] = useState<number | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  if (loading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!group || !schedule) return <p className="text-muted-foreground">{t('notFound')}</p>;

  const payoutEntry = schedule.rounds.find((r) => r.payout)?.payout ?? null;
  // The turn came before tracking began, so `priorReceived` already carries it — there is nothing
  // here to record, and doing so would credit the fund a second time.
  const turnIsHistorical =
    group.payoutRound !== null && group.payoutRound < group.joinedAtRound;
  const canRecordPayout =
    group.status === 'active' && group.payoutRound !== null && !payoutEntry && !turnIsHistorical;

  async function handleSetTurn() {
    setBusy(true);
    const parsed = turnInput === '' ? null : Number(turnInput);
    const result = await setRoscaPayoutRound({ groupId: id, payoutRound: parsed });
    setBusy(false);
    if (result.success) toast.success(t('turnSaved'));
    else toast.error(typeof result.error === 'string' ? result.error : t('turnFailed'));
  }

  async function handleRecordPayout() {
    setBusy(true);
    const result = await recordRoscaPayout({
      groupId: id,
      amount: payoutAmount ?? schedule!.expectedPayout,
      date: toInputDate(),
    });
    setBusy(false);
    if (result.success) {
      toast.success(t('payoutRecordedToast'));
      setPayoutAmount(undefined);
    } else {
      const err = result.error as Record<string, string[] | undefined> | undefined;
      toast.error(err?.amount?.[0] ?? t('payoutFailedToast'));
    }
  }

  async function handleStatus(status: 'active' | 'completed' | 'cancelled') {
    const result = await setRoscaStatus({ groupId: id, status });
    if (result.success) toast.success(t('statusChangedToast'));
    else toast.error(typeof result.error === 'string' ? result.error : t('statusFailedToast'));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <p className="text-sm text-muted-foreground">
            {t('perMonthMembers', {
              amount: formatCurrency(group.contributionAmount, currency),
              count: group.memberCount,
              fund: group.fundType,
            })}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline">{t(`groupStatus_${group.status}`)}</Badge>
            {schedule.hasPriorPosition && (
              <Badge variant="outline">
                {t('trackedFrom', { round: group.joinedAtRound })}
              </Badge>
            )}
            {group.payoutRound !== null && (
              <Badge variant="outline" className="gap-1">
                <Trophy className="h-3 w-3" />
                {t('yourTurnRound', { round: group.payoutRound })}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {group.status === 'active' ? (
            <>
              <ConfirmDialog
                trigger={<Button variant="outline" size="sm">{t('closeGroup')}</Button>}
                title={t('closeGroupTitle')}
                description={t('closeGroupDesc')}
                confirmLabel={t('closeGroup')}
                onConfirm={() => handleStatus('completed')}
              />
              <ConfirmDialog
                trigger={<Button variant="outline" size="sm">{t('leaveGroup')}</Button>}
                title={t('leaveGroupTitle')}
                description={t('leaveGroupDesc')}
                confirmLabel={t('leaveGroup')}
                destructive
                onConfirm={() => handleStatus('cancelled')}
              />
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => handleStatus('active')}>
              {t('reopenGroup')}
            </Button>
          )}
        </div>
      </div>

      {schedule.hasPriorPosition && (
        <p className="rounded-lg border border-border/50 bg-muted/30 p-3 text-sm text-muted-foreground">
          {t('priorPositionNote', { round: group.joinedAtRound })}
        </p>
      )}

      <RoscaPositionCard schedule={schedule} />

      {/* Your turn: set it, then record what actually arrived. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('yourTurn')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {group.payoutRound === null ? (
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-2">
                <Label htmlFor="turn">{t('setYourTurn')}</Label>
                <Input
                  id="turn"
                  type="number"
                  min={1}
                  max={group.memberCount}
                  className="w-32"
                  value={turnInput}
                  onChange={(e) => setTurnInput(e.target.value)}
                />
              </div>
              <Button variant="outline" disabled={busy || turnInput === ''} onClick={handleSetTurn}>
                {t('saveTurn')}
              </Button>
              <p className="w-full text-xs text-muted-foreground">{t('turnNotDrawnHint')}</p>
            </div>
          ) : turnIsHistorical ? (
            <p className="text-sm text-muted-foreground">
              {t('turnBeforeTracking', {
                round: group.payoutRound,
                amount: formatCurrency(group.priorReceived, currency),
              })}
            </p>
          ) : payoutEntry ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm">
                {t('payoutRecorded', {
                  round: payoutEntry.round,
                  amount: formatCurrency(payoutEntry.amount, currency),
                })}
              </p>
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    <Undo2 className="mr-1.5 h-4 w-4" />
                    {t('undo')}
                  </Button>
                }
                title={t('undoTitle')}
                description={t('undoPayoutDesc', {
                  amount: formatCurrency(payoutEntry.amount, currency),
                  fund: group.fundType,
                })}
                confirmLabel={t('undo')}
                destructive
                onConfirm={async () => {
                  const result = await reverseRoscaEntry({ entryId: payoutEntry.id });
                  if (result.success) toast.success(t('undoneToast'));
                  else toast.error(typeof result.error === 'string' ? result.error : t('undoFailedToast'));
                }}
              />
            </div>
          ) : canRecordPayout ? (
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-2">
                <Label htmlFor="payoutAmount">{t('payoutAmount')}</Label>
                <MoneyInput
                  id="payoutAmount"
                  className="w-40"
                  value={payoutAmount ?? schedule.expectedPayout}
                  onChange={setPayoutAmount}
                />
              </div>
              <Button disabled={busy} onClick={handleRecordPayout}>
                {t('recordPayout')}
              </Button>
              <p className="w-full text-xs text-muted-foreground">{t('payoutAmountHint')}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('payoutUnavailable')}</p>
          )}

          {schedule.remainingCount === 0 && !schedule.payoutReceived && (
            <p className="text-sm text-amber-400">
              {t('payoutNotRecorded', { count: group.memberCount })}
            </p>
          )}
        </CardContent>
      </Card>

      <RoscaScheduleTable schedule={schedule} />
    </div>
  );
}
