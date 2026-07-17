'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useFunds } from '@/lib/hooks/useFunds';
import { useTransfers } from '@/lib/hooks/useTransfers';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { createTransferSchema, CreateTransferInput } from '@/lib/utils/validators';
import { transferFunds, reverseTransfer } from '@/lib/services/transfer.service';
import { FUND_ORDER, FUND_CONFIG } from '@/lib/constants/fund-config';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { FundType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { MoneyInput } from '@/components/ui/money-input';
import { Undo2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';

import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';

export default function TransfersPage() {
  const { user } = useAuth();
  const { funds } = useFunds(user?.uid ?? null);
  const { transfers, loading } = useTransfers(user?.uid ?? null);
  const { currency } = useUserSettings();
  const tt = useTranslations('transfers');
  const tc = useTranslations('common');
  const tf = useTranslations('nav');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTransferInput>({
    resolver: zodResolver(createTransferSchema),
  });

  const fromFund = watch('fromFund');

  async function onSubmit(data: CreateTransferInput) {
    if (!user) return;
    const result = await transferFunds(data);
    if (result.success) {
      toast.success(tt('completedToast'));
      reset();
    } else {
      const msg = result.error?.amount?.[0] ?? result.error?.toFund?.[0] ?? tt('failedToast');
      toast.error(msg);
    }
  }

  async function handleUndo(transferId: string) {
    const result = await reverseTransfer({ transferId });
    if (result.success) {
      toast.success(tt('undoneToast'));
    } else {
      toast.error(result.error ?? tt('undoFailedToast'));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{tt('title')}</h1>
        <p className="text-muted-foreground text-sm">{tt('subtitle')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4" />
              {tt('newTransfer')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>{tt('from')}</Label>
                <Select onValueChange={(v) => setValue('fromFund', (v ?? 'stability') as FundType)}>
                  <SelectTrigger>
                    <SelectValue placeholder={tt('selectSource')} />
                  </SelectTrigger>
                  <SelectContent>
                    {FUND_ORDER.map((fundId) => {
                      const balance = funds?.[fundId]?.balance ?? 0;
                      return (
                        <SelectItem key={fundId} value={fundId}>
                          {tf(fundId)} ({formatCurrency(balance, currency)})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {errors.fromFund && <p className="text-sm text-destructive">{errors.fromFund.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>{tt('to')}</Label>
                <Select onValueChange={(v) => setValue('toFund', (v ?? 'growth') as FundType)}>
                  <SelectTrigger>
                    <SelectValue placeholder={tt('selectDest')} />
                  </SelectTrigger>
                  <SelectContent>
                    {FUND_ORDER.filter((f) => f !== fromFund).map((fundId) => (
                      <SelectItem key={fundId} value={fundId}>
                        {tf(fundId)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.toFund && <p className="text-sm text-destructive">{errors.toFund.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">{tt('amount')}</Label>
                <Controller
                  control={control}
                  name="amount"
                  render={({ field }) => (
                    <MoneyInput
                      id="amount"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
                {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">{tt('reason')}</Label>
                <Textarea id="reason" rows={2} placeholder={tt('reasonPlaceholder')} {...register('reason')} />
                {errors.reason && <p className="text-sm text-destructive">{errors.reason.message}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? tt('transferring') : tt('transferFunds')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{tt('history')}</CardTitle>
          </CardHeader>
          <CardContent>
            {transfers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">{tt('noTransfers')}</p>
            ) : (
              <div className="space-y-2">
                {transfers.map((t) => {
                  const from = FUND_CONFIG[t.fromFund];
                  const to = FUND_CONFIG[t.toFund];
                  const FromIcon = from.icon;
                  const ToIcon = to.icon;
                  return (
                    <div key={t.id} className="p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2 text-sm">
                        <FromIcon className={cn('h-3.5 w-3.5', from.color)} />
                        <span className={from.color}>{tf(t.fromFund)}</span>
                        <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
                        <ToIcon className={cn('h-3.5 w-3.5', to.color)} />
                        <span className={to.color}>{tf(t.toFund)}</span>
                        <span className="ml-auto font-semibold">{formatCurrency(t.amount, currency)}</span>
                        <ConfirmDialog
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground hover:text-destructive"
                              aria-label={tt('undo')}
                            >
                              <Undo2 className="h-4 w-4" />
                            </Button>
                          }
                          title={tt('undoTitle')}
                          description={tt('undoDesc', { amount: formatCurrency(t.amount, currency), to: tf(t.toFund), from: tf(t.fromFund) })}
                          confirmLabel={tt('undoConfirm')}
                          destructive
                          onConfirm={() => handleUndo(t.id)}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{t.reason}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(t.createdAt)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
