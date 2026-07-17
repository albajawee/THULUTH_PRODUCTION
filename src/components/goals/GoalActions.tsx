'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CheckCircle2, RotateCcw, Trash2 } from 'lucide-react';
import { Goal } from '@/lib/types';
import { setGoalStatus, deleteGoal } from '@/lib/services/goal.service';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

/**
 * Lifecycle actions for a goal. Goals move no money, so completing or reopening one is a pure
 * status change — safe to fire from the client and reflected immediately on refresh.
 */
export function GoalActions({ goal }: { goal: Goal }) {
  const router = useRouter();
  const t = useTranslations('goals');
  const tc = useTranslations('common');
  const [pending, setPending] = useState(false);

  async function changeStatus(status: 'completed' | 'active') {
    setPending(true);
    try {
      const result = await setGoalStatus({ goalId: goal.id, status });
      if (result.success) {
        toast.success(status === 'completed' ? t('achievedToast') : t('reopenedToast'));
        router.refresh();
      } else {
        toast.error(result.error ?? t('updateFailedToast'));
      }
    } catch {
      toast.error(t('updateFailedToast'));
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    const result = await deleteGoal({ goalId: goal.id });
    if (result.success) {
      toast.success(t('deletedToast'));
      router.push('/goals');
      router.refresh();
    } else {
      toast.error(result.error ?? t('deleteFailedToast'));
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {goal.status === 'completed' ? (
        <Button variant="outline" disabled={pending} onClick={() => changeStatus('active')}>
          <RotateCcw className="mr-2 h-4 w-4" />
          {t('reopen')}
        </Button>
      ) : (
        <Button disabled={pending} onClick={() => changeStatus('completed')}>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {t('markAchieved')}
        </Button>
      )}

      <ConfirmDialog
        trigger={
          <Button variant="ghost" className="text-destructive" disabled={pending}>
            <Trash2 className="mr-2 h-4 w-4" />
            {tc('delete')}
          </Button>
        }
        title={t('deleteGoalTitle')}
        description={t('deleteGoalDesc')}
        confirmLabel={t('deleteGoalConfirm')}
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
