'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { createGoalSchema, CreateGoalInput } from '@/lib/utils/validators';
import { createGoal } from '@/lib/services/goal.service';
import { useAuth } from '@/lib/hooks/useAuth';
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

const FUND_OPTIONS = [
  { value: 'stability', emoji: '🏠' },
  { value: 'growth',    emoji: '📈' },
  { value: 'life',      emoji: '✨' },
  { value: 'charity',   emoji: '🤲' },
] as const;

interface GoalFormProps {
  onSuccess?: () => void;
}

export function GoalForm({ onSuccess }: GoalFormProps) {
  const { user } = useAuth();
  const t = useTranslations('goals');
  const tc = useTranslations('common');
  const tf = useTranslations('nav');

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateGoalInput>({
    resolver: zodResolver(createGoalSchema),
    defaultValues: { priority: 'medium' },
  });

  async function onSubmit(data: CreateGoalInput) {
    if (!user) { toast.error(tc('notAuthenticated')); return; }
    const result = await createGoal(data);
    if (result.success) {
      toast.success(t('createdToast'));
      reset();
      onSuccess?.();
    } else {
      toast.error(t('createFailedToast'));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">{t('goalTitle')}</Label>
        <Input id="title" placeholder={t('titlePlaceholder')} {...register('title')} />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{tc('description')}</Label>
        <Textarea id="description" rows={2} placeholder={t('descriptionPlaceholder')} {...register('description')} />
        {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="targetAmount">{t('targetAmount')}</Label>
        <Controller
          control={control}
          name="targetAmount"
          render={({ field }) => (
            <MoneyInput
              id="targetAmount"
              placeholder="0"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        {errors.targetAmount && <p className="text-sm text-destructive">{errors.targetAmount.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>{t('fundingFund')}</Label>
        <Select onValueChange={(v) => setValue('fundType', v as CreateGoalInput['fundType'])}>
          <SelectTrigger>
            <SelectValue placeholder={t('selectFund')} />
          </SelectTrigger>
          <SelectContent>
            {FUND_OPTIONS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.emoji} {tf(f.value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.fundType && <p className="text-sm text-destructive">{errors.fundType.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="deadline">{t('deadline')}</Label>
          <Input id="deadline" type="date" {...register('deadline')} />
          {errors.deadline && <p className="text-sm text-destructive">{errors.deadline.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>{t('priority')}</Label>
          <Select defaultValue="medium" onValueChange={(v) => setValue('priority', (v ?? 'medium') as CreateGoalInput['priority'])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">{t('high')}</SelectItem>
              <SelectItem value="medium">{t('medium')}</SelectItem>
              <SelectItem value="low">{t('low')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? t('creating') : t('createGoal')}
      </Button>
    </form>
  );
}
