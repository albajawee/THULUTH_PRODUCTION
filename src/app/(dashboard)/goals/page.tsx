'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/hooks/useAuth';
import { useGoals } from '@/lib/hooks/useGoals';
import { useFunds } from '@/lib/hooks/useFunds';
import { GoalCard } from '@/components/goals/GoalCard';
import { GoalForm } from '@/components/goals/GoalForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Target } from 'lucide-react';
import { FundType } from '@/lib/types';

export default function GoalsPage() {
  const { user } = useAuth();
  const { goals, activeGoals, completedGoals, loading } = useGoals(user?.uid ?? null);
  const { funds } = useFunds(user?.uid ?? null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const t = useTranslations('goals');

  function getFundBalance(fundType: FundType): number {
    return funds?.[fundType]?.balance ?? 0;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground text-sm">
            {t('summary', { active: activeGoals.length, completed: completedGoals.length })}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('newGoal')}
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('createNewGoal')}</DialogTitle>
          </DialogHeader>
          <GoalForm onSuccess={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">{t('active')} ({activeGoals.length})</TabsTrigger>
          <TabsTrigger value="completed">{t('completed')} ({completedGoals.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-xl" />
              ))}
            </div>
          ) : activeGoals.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Target className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">{t('noActiveGoals')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  fundBalance={getFundBalance(goal.fundType)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {completedGoals.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">{t('noCompletedGoals')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  fundBalance={getFundBalance(goal.fundType)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
