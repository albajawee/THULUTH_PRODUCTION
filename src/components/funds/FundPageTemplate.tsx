'use client';

import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/hooks/useAuth';
import { useFunds } from '@/lib/hooks/useFunds';
import { useExpenses } from '@/lib/hooks/useExpenses';
import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';
import { FundType } from '@/lib/types';
import { FUND_CONFIG } from '@/lib/constants/fund-config';
import { formatCurrency } from '@/lib/utils/formatters';
import { ExpenseForm } from '@/components/funds/ExpenseForm';
import { ExpenseHistory } from '@/components/funds/ExpenseHistory';
import { ExpenseAnalytics } from '@/components/funds/ExpenseAnalytics';
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
  const { expenses, loading, hasMore, loadingMore, loadMore } = useExpenses(user?.uid ?? null, fundType);
  const { currency } = useUserSettings();
  const t = useTranslations('funds');
  const tf = useTranslations('nav');

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
          <h1 className="text-2xl font-bold">{t('fundTitle', { name: tf(fundType) })}</h1>
          <p className="text-muted-foreground text-sm">{t(`${fundType}.description`)}</p>
        </div>
      </div>

      {/* Transferred is its own figure, never folded into Spent: money moved to another fund has
          not left your accounts, and showing it as spending overstates what the fund consumed. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(['balance', 'totalReceived', 'totalSpent', 'transferredOut'] as const).map((key) => {
          const labels = {
            balance: t('balance'),
            totalReceived: t('totalReceived'),
            totalSpent: t('totalSpent'),
            transferredOut: t('totalTransferred'),
          };
          const colors = {
            balance: config.color,
            totalReceived: 'text-emerald-400',
            totalSpent: 'text-rose-400',
            transferredOut: 'text-sky-400',
          };
          return (
            <Card key={key}>
              <CardContent className="pt-5">
                <p className="text-xs text-muted-foreground">{labels[key]}</p>
                {fund ? (
                  <p className={cn('text-xl font-bold', colors[key])}>
                    {formatCurrency(fund[key] ?? 0, currency)}
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

      {/* Analytics reads its own maintained aggregate — independent of the history query below.
          The fund's spent counter is passed only so the component can tell an empty fund from an
          unbuilt/denied rollup. */}
      <ExpenseAnalytics fundType={fundType} fundTotalSpent={fund?.totalSpent ?? 0} />

      <div className="grid gap-6 lg:grid-cols-2">
        <ExpenseForm fundType={fundType} />
        <ExpenseHistory
          expenses={expenses}
          loading={loading}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
        />
      </div>
    </div>
  );
}
