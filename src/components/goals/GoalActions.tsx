'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import { Goal } from '@/lib/types';
import { setGoalStatus } from '@/lib/services/goal.service';
import { Button } from '@/components/ui/button';

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
    </div>
  );
}
