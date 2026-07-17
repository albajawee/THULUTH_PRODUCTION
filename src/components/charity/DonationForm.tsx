'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { addDonationSchema, AddDonationInput } from '@/lib/utils/validators';
import { recordDonation } from '@/lib/services/charity.service';
import { useAuth } from '@/lib/hooks/useAuth';
import { toInputDate } from '@/lib/utils/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DonationFormProps {
  onSuccess?: () => void;
}

export function DonationForm({ onSuccess }: DonationFormProps) {
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddDonationInput>({
    resolver: zodResolver(addDonationSchema),
    defaultValues: { date: toInputDate() },
  });

  async function onSubmit(data: AddDonationInput) {
    if (!user) { toast.error('Not authenticated'); return; }
    const result = await recordDonation(data);
    if (result.success) {
      toast.success('Donation recorded');
      reset({ date: toInputDate() });
      onSuccess?.();
    } else {
      const err = result.error?.amount?.[0] ?? 'Failed to record donation';
      toast.error(err);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Record Donation</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient</Label>
            <Input
              id="recipient"
              placeholder="Who received this donation?"
              {...register('recipient')}
            />
            {errors.recipient && <p className="text-sm text-destructive">{errors.recipient.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Controller
              control={control}
              name="amount"
              render={({ field }) => (
                <MoneyInput
                  id="amount"
                  placeholder="0"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={2}
              placeholder="Purpose of this donation"
              {...register('description')}
            />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" {...register('date')} />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Recording...' : 'Record Donation'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
