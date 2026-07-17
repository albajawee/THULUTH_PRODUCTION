'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useFunds } from '@/lib/hooks/useFunds';
import { useTransfers } from '@/lib/hooks/useTransfers';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { createTransferSchema, CreateTransferInput } from '@/lib/utils/validators';
import { transferFunds } from '@/lib/services/transfer.service';
import { FUND_ORDER, FUND_CONFIG } from '@/lib/constants/fund-config';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { FundType } from '@/lib/types';
import { Button } from '@/components/ui/button';
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

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTransferInput>({
    resolver: zodResolver(createTransferSchema),
  });

  const fromFund = watch('fromFund');

  async function onSubmit(data: CreateTransferInput) {
    if (!user) return;
    const result = await transferFunds(user.uid, data);
    if (result.success) {
      toast.success('Transfer completed!');
      reset();
    } else {
      const msg = result.error?.amount?.[0] ?? result.error?.toFund?.[0] ?? 'Transfer failed';
      toast.error(msg);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transfers</h1>
        <p className="text-muted-foreground text-sm">Move funds between your four funds</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4" />
              New Transfer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>From Fund</Label>
                <Select onValueChange={(v) => setValue('fromFund', (v ?? 'stability') as FundType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source fund" />
                  </SelectTrigger>
                  <SelectContent>
                    {FUND_ORDER.map((fundId) => {
                      const config = FUND_CONFIG[fundId];
                      const balance = funds?.[fundId]?.balance ?? 0;
                      return (
                        <SelectItem key={fundId} value={fundId}>
                          {config.label} ({formatCurrency(balance, currency)})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {errors.fromFund && <p className="text-sm text-destructive">{errors.fromFund.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>To Fund</Label>
                <Select onValueChange={(v) => setValue('toFund', (v ?? 'growth') as FundType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination fund" />
                  </SelectTrigger>
                  <SelectContent>
                    {FUND_ORDER.filter((f) => f !== fromFund).map((fundId) => {
                      const config = FUND_CONFIG[fundId];
                      return (
                        <SelectItem key={fundId} value={fundId}>
                          {config.label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {errors.toFund && <p className="text-sm text-destructive">{errors.toFund.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  step="any"
                  {...register('amount', { valueAsNumber: true })}
                />
                {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea id="reason" rows={2} placeholder="Why are you transferring?" {...register('reason')} />
                {errors.reason && <p className="text-sm text-destructive">{errors.reason.message}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Transferring...' : 'Transfer Funds'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transfer History</CardTitle>
          </CardHeader>
          <CardContent>
            {transfers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No transfers yet.</p>
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
                        <span className={from.color}>{from.label}</span>
                        <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
                        <ToIcon className={cn('h-3.5 w-3.5', to.color)} />
                        <span className={to.color}>{to.label}</span>
                        <span className="ml-auto font-semibold">{formatCurrency(t.amount, currency)}</span>
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
