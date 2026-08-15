'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { createRoscaGroup } from '@/lib/services/rosca.service';
import { CreateRoscaGroupInput } from '@/lib/utils/validators';
import { startDateFromRound, todayISO } from '@/lib/utils/rosca';
import { formatCurrency } from '@/lib/utils/formatters';
import { useAuth } from '@/lib/hooks/useAuth';
import { useFunds } from '@/lib/hooks/useFunds';
import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';
import { FUND_ORDER } from '@/lib/constants/fund-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { FundType } from '@/lib/types';

interface RoscaGroupFormProps {
  onSuccess?: () => void;
}

/**
 * Creating a group records no money movement — it only describes an arrangement.
 *
 * The form deliberately does not ask for `startDate`. Most people add a group that is already under
 * way and know "we're on round 6, due this month", not when round 1 was; asking the question they
 * can answer and back-solving round 1 from it is the difference between a usable form and a wrong
 * one. A group tracked from the start is just `joinedAtRound = 1`, where the same question reads as
 * "when is round 1 due?".
 */
export function RoscaGroupForm({ onSuccess }: RoscaGroupFormProps) {
  const { user } = useAuth();
  const { funds } = useFunds(user?.uid ?? null);
  const { currency } = useUserSettings();
  const t = useTranslations('rosca');
  const tc = useTranslations('common');
  const tf = useTranslations('nav');

  /**
   * The opening position and the payout round are held here rather than in the form.
   *
   * They are interdependent — the prior amounts are derived from the round you joined at and the
   * round of your turn — and driving that with `setValue` from a field's `onChange` let them fall
   * out of step: a group could be saved claiming it was tracked from round 1 while also carrying
   * money paid before tracking, which is a contradiction. Deriving on every render instead of
   * pushing updates means there is only ever one answer.
   *
   * `undefined` on the two amounts means "not touched, use the derived figure"; a number means the
   * user typed over it, which is allowed because a real history can be irregular.
   */
  const [alreadyStarted, setAlreadyStarted] = useState(false);
  const [joinedAtRound, setJoinedAtRound] = useState(1);
  const [payoutRound, setPayoutRound] = useState<number | null>(null);
  const [priorContributedEdit, setPriorContributedEdit] = useState<number | undefined>(undefined);
  const [priorReceivedEdit, setPriorReceivedEdit] = useState<number | undefined>(undefined);

  const {
    register, handleSubmit, setValue, control, watch, reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateRoscaGroupInput>({
    // No zodResolver: the note-base rule is currency-dependent and lives server-side, so validating
    // twice with different rules would report errors the server doesn't have. Field errors come back
    // from the action instead.
    defaultValues: {
      joinedAtRound: 1,
      payoutRound: null,
      priorContributed: 0,
      priorReceived: 0,
      note: '',
      startDate: todayISO(),
    },
  });

  const contributionAmount = watch('contributionAmount');
  const memberCount = watch('memberCount');
  const expectedPayout = (contributionAmount ?? 0) * (memberCount ?? 0);

  // A group not marked as already under way is tracked from round 1, where an opening position is
  // by definition zero. Everything below flows from these two lines.
  const effectiveJoinedAt = alreadyStarted ? joinedAtRound : 1;
  const derivedPriorContributed =
    Math.max(0, effectiveJoinedAt - 1) * (contributionAmount ?? 0);
  const derivedPriorReceived =
    payoutRound !== null && payoutRound < effectiveJoinedAt ? expectedPayout : 0;

  const priorContributed = alreadyStarted
    ? (priorContributedEdit ?? derivedPriorContributed)
    : 0;
  const priorReceived = alreadyStarted ? (priorReceivedEdit ?? derivedPriorReceived) : 0;

  async function onSubmit(data: CreateRoscaGroupInput) {
    if (!user) { toast.error(tc('notAuthenticated')); return; }

    const payload: CreateRoscaGroupInput = {
      ...data,
      // The date field holds the due date of whichever round they're on; round 1 falls out of it.
      startDate: startDateFromRound(data.startDate, effectiveJoinedAt),
      joinedAtRound: effectiveJoinedAt,
      payoutRound,
      priorContributed,
      priorReceived,
    };

    const result = await createRoscaGroup(payload);
    if (result.success) {
      toast.success(t('createdToast'));
      reset();
      setAlreadyStarted(false);
      setJoinedAtRound(1);
      setPayoutRound(null);
      setPriorContributedEdit(undefined);
      setPriorReceivedEdit(undefined);
      onSuccess?.();
    } else {
      // Validation lives server-side (the note-base rule depends on the saved currency), so surface
      // whichever field it rejected rather than a generic failure the user can't act on.
      const err = result.error as Record<string, string[] | undefined> | undefined;
      const first = err && Object.values(err).find((messages) => messages?.length)?.[0];
      toast.error(first ?? t('createFailedToast'));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t('groupName')}</Label>
        <Input id="name" placeholder={t('groupNamePlaceholder')} {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contributionAmount">{t('contributionAmount')}</Label>
          <Controller
            control={control}
            name="contributionAmount"
            render={({ field }) => (
              <MoneyInput
                id="contributionAmount"
                placeholder="0"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="memberCount">{t('memberCount')}</Label>
          <Input
            id="memberCount"
            type="number"
            min={2}
            max={60}
            {...register('memberCount', { valueAsNumber: true })}
          />
          <p className="text-xs text-muted-foreground">{t('memberCountHint')}</p>
        </div>
      </div>

      {expectedPayout > 0 && (
        <p className="text-sm text-muted-foreground">
          {t('expectedPayoutHint', { amount: formatCurrency(expectedPayout, currency) })}
        </p>
      )}

      <div className="space-y-2">
        <Label>{t('fund')}</Label>
        <Select onValueChange={(v) => setValue('fundType', (v ?? 'growth') as FundType)}>
          <SelectTrigger><SelectValue placeholder={t('selectFund')} /></SelectTrigger>
          <SelectContent>
            {FUND_ORDER.map((fundId) => (
              <SelectItem key={fundId} value={fundId}>
                {tf(fundId)} ({formatCurrency(funds?.[fundId]?.balance ?? 0, currency)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{t('fundHint')}</p>
      </div>

      {/* Opening position. Hidden entirely for a group tracked from round 1, which needs none of it. */}
      <div className="flex items-start justify-between gap-4 rounded-lg border border-border/50 p-3">
        <div className="space-y-1">
          <Label htmlFor="alreadyStarted" className="cursor-pointer">{t('alreadyStarted')}</Label>
          <p className="text-xs text-muted-foreground">{t('alreadyStartedHint')}</p>
        </div>
        <Switch
          id="alreadyStarted"
          checked={alreadyStarted}
          onCheckedChange={(checked) => {
            setAlreadyStarted(checked);
            // Drop any manual overrides so re-enabling starts from the derived figures again.
            setPriorContributedEdit(undefined);
            setPriorReceivedEdit(undefined);
            if (!checked) setJoinedAtRound(1);
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {alreadyStarted && (
          <div className="space-y-2">
            <Label htmlFor="joinedAtRound">{t('currentRound')}</Label>
            <Input
              id="joinedAtRound"
              type="number"
              min={1}
              value={joinedAtRound}
              onChange={(e) => setJoinedAtRound(Number(e.target.value) || 1)}
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="startDate">
            {alreadyStarted ? t('currentRoundDue') : t('firstRoundDue')}
          </Label>
          <Input id="startDate" type="date" {...register('startDate')} />
        </div>
      </div>

      {alreadyStarted && (
        <div className="grid grid-cols-2 gap-4 rounded-lg border border-border/50 p-3">
          <div className="space-y-2">
            <Label htmlFor="priorContributed">{t('priorContributed')}</Label>
            <MoneyInput
              id="priorContributed"
              value={priorContributed}
              onChange={(v) => setPriorContributedEdit(v ?? 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="priorReceived">{t('priorReceived')}</Label>
            <MoneyInput
              id="priorReceived"
              value={priorReceived}
              onChange={(v) => setPriorReceivedEdit(v ?? 0)}
            />
          </div>
          <p className="col-span-2 text-xs text-muted-foreground">{t('priorHint')}</p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="payoutRound">{t('payoutRound')}</Label>
        <Input
          id="payoutRound"
          type="number"
          min={1}
          placeholder={t('payoutRoundUnknown')}
          value={payoutRound ?? ''}
          onChange={(e) => setPayoutRound(e.target.value === '' ? null : Number(e.target.value))}
        />
        <p className="text-xs text-muted-foreground">{t('payoutRoundHint')}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">{t('note')}</Label>
        <Textarea id="note" rows={2} placeholder={t('notePlaceholder')} {...register('note')} />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? t('creating') : t('createGroup')}
      </Button>
    </form>
  );
}
