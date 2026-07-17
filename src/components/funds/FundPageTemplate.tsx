'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useFunds } from '@/lib/hooks/useFunds';
import { useExpenses } from '@/lib/hooks/useExpenses';
import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';
import { FundType } from '@/lib/types';
import { FUND_CONFIG } from '@/lib/constants/fund-config';
import { formatCurrency } from '@/lib/utils/formatters';
import { ExpenseForm } from '@/components/funds/ExpenseForm';
import { ExpenseHistory } from '@/components/funds/ExpenseHistory';
import { CategoryBreakdown } from '@/components/funds/CategoryBreakdown';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface FundPageTemplateProps {
  fundType: FundType;
  children?: React.ReactNode;
}

export function FundPageTemplate({ fundType, children }: FundPageTemplateProps) {
  const { user } = useAuth();
  const { funds } = useFunds(user?.uid ?? null);
  const { expenses, loading } = useExpenses(user?.uid ?? null, fundType);
  const { currency } = useUserSettings();

  const config = FUND_CONFIG[fundType];
  const Icon = config.icon;
  const fund = funds?.[fundType];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className={cn('p-3 rounded-xl', config.bgColor)}>
          <Icon className={cn('h-6 w-6', config.color)} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{config.label} Fund</h1>
          <p className="text-muted-foreground text-sm">{config.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {(['balance', 'totalReceived', 'totalSpent'] as const).map((key) => {
          const labels = { balance: 'Balance', totalReceived: 'Total Received', totalSpent: 'Total Spent' };
          const colors = { balance: config.color, totalReceived: 'text-emerald-400', totalSpent: 'text-rose-400' };
          return (
            <Card key={key}>
              <CardContent className="pt-5">
                <p className="text-xs text-muted-foreground">{labels[key]}</p>
                {fund ? (
                  <p className={cn('text-xl font-bold', colors[key])}>
                    {formatCurrency(fund[key], currency)}
                  </p>
                ) : (
                  <Skeleton className="h-7 w-32 mt-1" />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {children}

      <div className="grid gap-6 lg:grid-cols-2">
        <ExpenseForm fundType={fundType} />
        <CategoryBreakdown expenses={expenses} />
      </div>

      <ExpenseHistory expenses={expenses} loading={loading} />
    </div>
  );
}
