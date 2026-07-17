'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Goal } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/formatters';
import { calcGoalProgress } from '@/lib/utils/calculations';
import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActiveGoalsProps {
  goals: Goal[];
  fundBalances: Record<string, number>;
}

const PRIORITY_COLORS = {
  high: 'text-rose-400 bg-rose-500/10',
  medium: 'text-amber-400 bg-amber-500/10',
  low: 'text-blue-400 bg-blue-500/10',
};

export function ActiveGoals({ goals, fundBalances }: ActiveGoalsProps) {
  const { currency } = useUserSettings();
  const t = useTranslations('dashboard');
  const tg = useTranslations('goals');
  const displayed = goals.slice(0, 3);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">{t('activeGoals')}</CardTitle>
        <Link
          href="/goals"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          {t('viewAll')} <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {displayed.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {t('noGoals')}
          </p>
        ) : (
          <div className="space-y-4">
            {displayed.map((goal) => {
              const fundBalance = fundBalances[goal.fundType] ?? 0;
              const { percentage, remaining } = calcGoalProgress(
                goal.targetAmount,
                fundBalance,
                goal.deadline
              );
              return (
                <Link key={goal.id} href={`/goals/${goal.id}`} className="block group">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-emerald-400" />
                        <span className="text-sm font-medium group-hover:text-primary transition-colors">
                          {goal.title}
                        </span>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn('text-xs', PRIORITY_COLORS[goal.priority])}
                      >
                        {tg(goal.priority)}
                      </Badge>
                    </div>
                    <Progress value={percentage} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{percentage}% {t('complete')}</span>
                      <span>{formatCurrency(remaining, currency)} {t('left')}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
