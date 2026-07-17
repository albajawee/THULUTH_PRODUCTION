'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  const [pending, setPending] = useState(false);

  async function changeStatus(status: 'completed' | 'active') {
    setPending(true);
    try {
      const result = await setGoalStatus({ goalId: goal.id, status });
      if (result.success) {
        toast.success(status === 'completed' ? 'Goal marked as achieved 🎉' : 'Goal reopened');
        router.refresh();
      } else {
        toast.error(result.error ?? 'Could not update the goal');
      }
    } catch {
      toast.error('Could not update the goal');
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    const result = await deleteGoal({ goalId: goal.id });
    if (result.success) {
      toast.success('Goal deleted');
      router.push('/goals');
      router.refresh();
    } else {
      toast.error(result.error ?? 'Could not delete the goal');
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {goal.status === 'completed' ? (
        <Button variant="outline" disabled={pending} onClick={() => changeStatus('active')}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reopen goal
        </Button>
      ) : (
        <Button disabled={pending} onClick={() => changeStatus('completed')}>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Mark as achieved
        </Button>
      )}

      <ConfirmDialog
        trigger={
          <Button variant="ghost" className="text-destructive" disabled={pending}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        }
        title="Delete this goal?"
        description="This permanently removes the goal. Your funds and their balances are not affected — goals never held money."
        confirmLabel="Delete goal"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
