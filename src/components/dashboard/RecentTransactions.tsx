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

/**
 * Direction comes from the sign of the amount, not from a list of type names. Every writer already
 * encodes it — expenses, donations and transfers out are negative; income and transfers in are
 * positive — and a `reversal` carries whichever sign the undo actually moved, which a fixed type
 * list could never get right.
 */
function getTransactionIcon(tx: Transaction) {
  return tx.amount >= 0 ? ArrowDownLeft : ArrowUpRight;
}

/**
 * ROSCA movements get their own tone rather than green or rose: a contribution is not spending and
 * a payout is not income, and colouring them like either asserts exactly the equivalence the
 * feature exists to deny. Keyed on `relatedType` so reversals of them are coloured to match. Indigo
 * rather than sky, which already means "transferred" on the fund pages.
 */
function getTransactionColor(tx: Transaction) {
  if (tx.relatedType === 'rosca') return 'text-indigo-400';
  return tx.amount >= 0 ? 'text-emerald-400' : 'text-rose-400';
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
              const Icon = getTransactionIcon(tx);
              const color = getTransactionColor(tx);
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
