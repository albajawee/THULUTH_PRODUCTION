'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { addExpenseSchema, AddExpenseInput } from '@/lib/utils/validators';
import { addExpense } from '@/lib/services/expense.service';
import { useAuth } from '@/lib/hooks/useAuth';
import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';
import { FundType } from '@/lib/types';
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

interface ExpenseFormProps {
  fundType: FundType;
  onSuccess?: () => void;
}

export function ExpenseForm({ fundType, onSuccess }: ExpenseFormProps) {
  const { user } = useAuth();
  const { categories: allCategories } = useUserSettings();
  const t = useTranslations('funds');
  const tc = useTranslations('common');

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddExpenseInput>({
    resolver: zodResolver(addExpenseSchema),
    defaultValues: { fundType, date: toInputDate() },
  });

  async function onSubmit(data: AddExpenseInput) {
    if (!user) { toast.error(tc('notAuthenticated')); return; }
    const result = await addExpense(data);
    if (result.success) {
      toast.success(t('expenseRecorded'));
      reset({ fundType, date: toInputDate() });
      onSuccess?.();
    } else {
      toast.error(t('expenseFailed'));
    }
  }

  const categories = allCategories[fundType] ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('addExpense')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register('fundType')} />

          <div className="space-y-2">
            <Label>{tc('category')}</Label>
            <Select
              onValueChange={(v) => setValue('category', v ?? '')}
              defaultValue=""
            >
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
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category.message}</p>
            )}
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
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{tc('description')}</Label>
            <Textarea
              id="description"
              rows={2}
              placeholder={t('expenseDescriptionPlaceholder')}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">{tc('date')}</Label>
            <Input id="date" type="date" {...register('date')} />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? tc('saving') : t('addExpense')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
