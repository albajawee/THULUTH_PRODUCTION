'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { addIncomeSchema, AddIncomeInput } from '@/lib/utils/validators';
import { addIncome } from '@/lib/services/income.service';
import { distributeIncome } from '@/lib/utils/calculations';
import { useAuth } from '@/lib/hooks/useAuth';
import { toInputDate } from '@/lib/utils/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DistributionPreview } from './DistributionPreview';

export function IncomeForm() {
  const { user } = useAuth();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AddIncomeInput>({
    resolver: zodResolver(addIncomeSchema),
    defaultValues: { date: toInputDate() },
  });

  const watchedAmount = watch('amount');
  const distribution = watchedAmount > 0 ? distributeIncome(watchedAmount) : null;

  async function onSubmit(data: AddIncomeInput) {
    if (!user) { toast.error('Not authenticated'); return; }
    const result = await addIncome(data);
    if (result.success) {
      toast.success('Income added and distributed!');
      router.push('/income');
    } else {
      toast.error('Failed to add income. Please try again.');
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Add Income</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Controller
                control={control}
                name="amount"
                render={({ field }) => (
                  <MoneyInput
                    id="amount"
                    placeholder="e.g. 5,000"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                type="text"
                placeholder="e.g. Salary, Freelance"
                {...register('source')}
              />
              {errors.source && (
                <p className="text-sm text-destructive">{errors.source.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" {...register('date')} />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Note (optional)</Label>
              <Textarea
                id="note"
                rows={2}
                placeholder="Any additional notes..."
                {...register('note')}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : 'Add Income'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {distribution && (
        <DistributionPreview distribution={distribution} total={watchedAmount} />
      )}
    </div>
  );
}
