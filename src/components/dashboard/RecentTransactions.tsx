'use client';

import { useTranslations } from 'next-intl';
import { Transaction } from '@/lib/types';
import { FUND_CONFIG } from '@/lib/constants/fund-config';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface RecentTransactionsProps {
  transactions: Transaction[];
}

function getTransactionIcon(type: Transaction['type']) {
  if (type === 'income_distribution') return ArrowDownLeft;
  if (type === 'transfer_in') return ArrowDownLeft;
  return ArrowUpRight;
}

function getTransactionColor(type: Transaction['type']) {
  if (type === 'income_distribution' || type === 'transfer_in') return 'text-emerald-400';
  return 'text-rose-400';
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const { currency } = useUserSettings();
  const t = useTranslations('dashboard');
  const tf = useTranslations('nav');
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{t('recentTransactions')}</CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {t('noTransactions')}
          </p>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => {
              const Icon = getTransactionIcon(tx.type);
              const color = getTransactionColor(tx.type);
              const fundConfig = FUND_CONFIG[tx.fundType];
              const isPositive = tx.amount > 0;

              return (
                <div key={tx.id} className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-lg', fundConfig.bgColor)}>
                    <Icon className={cn('h-4 w-4', fundConfig.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {tf(tx.fundType)} · {formatDate(tx.createdAt)}
                    </p>
                  </div>
                  <span className={cn('text-sm font-semibold tabular-nums', color)}>
                    {isPositive ? '+' : ''}{formatCurrency(Math.abs(tx.amount), currency)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
