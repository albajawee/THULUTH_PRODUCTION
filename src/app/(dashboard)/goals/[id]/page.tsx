'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/hooks/useAuth';
import { useFunds } from '@/lib/hooks/useFunds';
import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';
import { goalRepository } from '@/lib/repositories/goal.repository';
import { calcGoalProgress } from '@/lib/utils/calculations';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { Goal } from '@/lib/types';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { GoalActions } from '@/components/goals/GoalActions';
import { Target, Calendar, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-rose-400 bg-rose-500/10',
  medium: 'text-amber-400 bg-amber-500/10',
  low: 'text-blue-400 bg-blue-500/10',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'text-emerald-400 bg-emerald-500/10',
  completed: 'text-violet-400 bg-violet-500/10',
  paused: 'text-muted-foreground bg-muted',
};

const FUND_EMOJI: Record<string, string> = {
  stability: '🏠',
  growth: '📈',
  life: '✨',
  charity: '🤲',
};

export default function GoalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { funds } = useFunds(user?.uid ?? null);
  const { currency } = useUserSettings();
  const t = useTranslations('goals');
  const tf = useTranslations('nav');
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    goalRepository.getGoalById(user.uid, id)
      .then(setGoal)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [user, id]);

  if (loading) return <Skeleton className="h-64 rounded-xl w-full" />;
  if (!goal) return <p className="text-muted-foreground">{t('notFound')}</p>;

  const fundBalance = funds?.[goal.fundType]?.balance ?? 0;
  const { percentage, remaining } = calcGoalProgress(
    goal.targetAmount,
    fundBalance,
    goal.deadline
  );

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-emerald-500/10">
          <Target className="h-6 w-6 text-emerald-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{goal.title}</h1>
            <Badge variant="secondary" className={cn(STATUS_COLORS[goal.status])}>
              {t(goal.status)}
            </Badge>
            <Badge variant="secondary" className={cn(PRIORITY_COLORS[goal.priority])}>
              {t('priorityLabel', { level: t(goal.priority) })}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">{goal.description}</p>
        </div>
      </div>

      {/* Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4 text-emerald-400" />
            {t('progressVia', { fund: `${FUND_EMOJI[goal.fundType]} ${tf(goal.fundType)}` })}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {t('progressNote')}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{t('progress')}</span>
            <span className={cn('text-sm font-bold', percentage >= 100 ? 'text-violet-400' : 'text-emerald-400')}>
              {percentage}%
            </span>
          </div>
          <Progress value={percentage} className="h-3" />
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div>
              <p className="text-xs text-muted-foreground">{t('target')}</p>
              <p className="font-bold">{formatCurrency(goal.targetAmount, currency)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('fundBalance')}</p>
              <p className="font-bold text-emerald-400">{formatCurrency(fundBalance, currency)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('stillNeeded')}</p>
              <p className={cn('font-bold', remaining === 0 ? 'text-violet-400' : 'text-rose-400')}>
                {remaining === 0 ? t('reached') : formatCurrency(remaining, currency)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
            <Calendar className="h-3 w-3" />
            <span>{t('deadline')}: {formatDate(goal.deadline)}</span>
          </div>
        </CardContent>
      </Card>

      <GoalActions goal={goal} />
    </div>
  );
}
