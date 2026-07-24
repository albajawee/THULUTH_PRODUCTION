'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { addDonationSchema, AddDonationInput } from '@/lib/utils/validators';
import { recordDonation } from '@/lib/services/charity.service';
import { useAuth } from '@/lib/hooks/useAuth';
import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';
import { toInputDate } from '@/lib/utils/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
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

interface DonationFormProps {
  onSuccess?: () => void;
}

export function DonationForm({ onSuccess }: DonationFormProps) {
  const { user } = useAuth();
  const { categories: allCategories } = useUserSettings();
  const t = useTranslations('charity');
  const tc = useTranslations('common');

  // The same list Settings edits — until now nothing read it.
  const categories = allCategories.charity ?? [];

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddDonationInput>({
    resolver: zodResolver(addDonationSchema),
    defaultValues: { date: toInputDate() },
  });

  async function onSubmit(data: AddDonationInput) {
    if (!user) { toast.error(tc('notAuthenticated')); return; }
    const result = await recordDonation(data);
    if (result.success) {
      toast.success(t('recordedToast'));
      reset({ date: toInputDate() });
      onSuccess?.();
    } else {
      const err = result.error?.amount?.[0] ?? t('recordFailedToast');
      toast.error(err);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('recordDonation')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipient">{t('recipient')}</Label>
            <Input
              id="recipient"
              placeholder={t('recipientPlaceholder')}
              {...register('recipient')}
            />
            {errors.recipient && <p className="text-sm text-destructive">{errors.recipient.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>{tc('category')}</Label>
            <Select onValueChange={(v) => setValue('category', v ?? '')} defaultValue="">
              <SelectTrigger>
                <SelectValue placeholder={t('selectCategory')} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">{tc('amount')}</Label>
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
            <Label htmlFor="description">{tc('description')}</Label>
            <Textarea
              id="description"
              rows={2}
              placeholder={t('descriptionPlaceholder')}
              {...register('description')}
            />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">{tc('date')}</Label>
            <Input id="date" type="date" {...register('date')} />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? t('recording') : t('recordDonation')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
