'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Goal } from '@/lib/types';
import { calcGoalProgress } from '@/lib/utils/calculations';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRIORITY_COLORS = {
  high: 'text-rose-400 bg-rose-500/10',
  medium: 'text-amber-400 bg-amber-500/10',
  low: 'text-blue-400 bg-blue-500/10',
};

const STATUS_COLORS = {
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

interface GoalCardProps {
  goal: Goal;
  fundBalance: number;
}

export function GoalCard({ goal, fundBalance }: GoalCardProps) {
  const { currency } = useUserSettings();
  const t = useTranslations('goals');
  const tf = useTranslations('nav');
  const { percentage, remaining } = calcGoalProgress(
    goal.targetAmount,
    fundBalance,
    goal.deadline
  );

  return (
    <Link href={`/goals/${goal.id}`}>
      <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <h3 className="font-semibold text-sm leading-snug">{goal.title}</h3>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <Badge variant="secondary" className={cn('text-xs', STATUS_COLORS[goal.status])}>
                {t(goal.status)}
              </Badge>
              <Badge variant="secondary" className={cn('text-xs', PRIORITY_COLORS[goal.priority])}>
                {t(goal.priority)}
              </Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{goal.description}</p>
        </CardHeader>
        <CardContent>
          <Progress value={percentage} className="h-2 mb-3" />
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">
              {formatCurrency(fundBalance, currency)} / {formatCurrency(goal.targetAmount, currency)}
            </span>
            <span className="font-semibold text-emerald-400">{percentage}%</span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">{FUND_EMOJI[goal.fundType]} {tf(goal.fundType)}</span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(goal.deadline)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
