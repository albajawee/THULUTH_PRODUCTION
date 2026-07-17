'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { createGoalSchema, CreateGoalInput } from '@/lib/utils/validators';
import { createGoal } from '@/lib/services/goal.service';
import { useAuth } from '@/lib/hooks/useAuth';
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

const FUND_OPTIONS = [
  { value: 'stability', label: 'Stability Fund', emoji: '🏠' },
  { value: 'growth',    label: 'Growth Fund',    emoji: '📈' },
  { value: 'life',      label: 'Life Fund',       emoji: '✨' },
  { value: 'charity',   label: 'Charity Fund',    emoji: '🤲' },
] as const;

interface GoalFormProps {
  onSuccess?: () => void;
}

export function GoalForm({ onSuccess }: GoalFormProps) {
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateGoalInput>({
    resolver: zodResolver(createGoalSchema),
    defaultValues: { priority: 'medium' },
  });

  async function onSubmit(data: CreateGoalInput) {
    if (!user) { toast.error('Not authenticated'); return; }
    const result = await createGoal(user.uid, data);
    if (result.success) {
      toast.success('Goal created!');
      reset();
      onSuccess?.();
    } else {
      toast.error('Failed to create goal');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Goal Title</Label>
        <Input id="title" placeholder="e.g. Buy a gift for my wife" {...register('title')} />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" rows={2} placeholder="Describe your goal..." {...register('description')} />
        {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="targetAmount">Target Amount</Label>
        <Input
          id="targetAmount"
          type="number"
          min="1"
          step="any"
          placeholder="0"
          {...register('targetAmount', { valueAsNumber: true })}
        />
        {errors.targetAmount && <p className="text-sm text-destructive">{errors.targetAmount.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Funding Fund</Label>
        <Select onValueChange={(v) => setValue('fundType', v as CreateGoalInput['fundType'])}>
          <SelectTrigger>
            <SelectValue placeholder="Select a fund…" />
          </SelectTrigger>
          <SelectContent>
            {FUND_OPTIONS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.emoji} {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.fundType && <p className="text-sm text-destructive">{errors.fundType.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="deadline">Deadline</Label>
          <Input id="deadline" type="date" {...register('deadline')} />
          {errors.deadline && <p className="text-sm text-destructive">{errors.deadline.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Priority</Label>
          <Select defaultValue="medium" onValueChange={(v) => setValue('priority', (v ?? 'medium') as CreateGoalInput['priority'])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Goal'}
      </Button>
    </form>
  );
}
