'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { IncomeDistribution } from '@/lib/types';
import { FUND_CONFIG, FUND_ORDER } from '@/lib/constants/fund-config';
import { formatCurrency } from '@/lib/utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DistributionPreviewProps {
  distribution: IncomeDistribution;
  total: number;
  currency?: string;
}

export function DistributionPreview({
  distribution,
  total,
  currency = 'SAR',
}: DistributionPreviewProps) {
  const t = useTranslations('income');
  const tf = useTranslations('nav');
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('distribution')}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('total')}: {formatCurrency(total, currency)}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {FUND_ORDER.map((fundId) => {
            const config = FUND_CONFIG[fundId];
            const Icon = config.icon;
            const amount = distribution[fundId];

            return (
              <motion.div
                key={fundId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border',
                  config.bgColor,
                  config.borderColor
                )}
              >
                <div className={cn('p-1.5 rounded-md bg-background/50')}>
                  <Icon className={cn('h-4 w-4', config.color)} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{tf(fundId)}</span>
                    <span className={cn('text-sm font-bold', config.color)}>
                      {config.percentage}%
                    </span>
                  </div>
                  <motion.p
                    key={amount}
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    className="text-lg font-bold"
                  >
                    {formatCurrency(amount, currency)}
                  </motion.p>
                </div>
              </motion.div>
            );
          })}
        </div>
        <div className="mt-4 pt-3 border-t border-border/50 flex justify-between text-sm">
          <span className="text-muted-foreground">{t('distributed')}</span>
          <span className="font-semibold">
            {formatCurrency(
              Object.values(distribution).reduce((a, b) => a + b, 0),
              currency
            )}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
