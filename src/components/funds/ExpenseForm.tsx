'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { addExpenseSchema, AddExpenseInput } from '@/lib/utils/validators';
import { addExpense } from '@/lib/services/expense.service';
import { useAuth } from '@/lib/hooks/useAuth';
import { FundType } from '@/lib/types';
import { CATEGORIES_BY_FUND } from '@/lib/constants/fund-categories';
import { toInputDate } from '@/lib/utils/formatters';
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

interface ExpenseFormProps {
  fundType: FundType;
  onSuccess?: () => void;
}

export function ExpenseForm({ fundType, onSuccess }: ExpenseFormProps) {
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddExpenseInput>({
    resolver: zodResolver(addExpenseSchema),
    defaultValues: { fundType, date: toInputDate() },
  });

  async function onSubmit(data: AddExpenseInput) {
    if (!user) { toast.error('Not authenticated'); return; }
    const result = await addExpense(data);
    if (result.success) {
      toast.success('Expense recorded');
      reset({ fundType, date: toInputDate() });
      onSuccess?.();
    } else {
      toast.error('Failed to record expense');
    }
  }

  const categories = CATEGORIES_BY_FUND[fundType] ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add Expense</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register('fundType')} />

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              onValueChange={(v) => setValue('category', v ?? '')}
              defaultValue=""
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              step="any"
              placeholder="0"
              {...register('amount', { valueAsNumber: true })}
            />
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={2}
              placeholder="What was this expense for?"
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" {...register('date')} />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Add Expense'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
