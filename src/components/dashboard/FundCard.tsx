'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Fund, FundType } from '@/lib/types';
import { FUND_CONFIG } from '@/lib/constants/fund-config';
import { formatCurrency } from '@/lib/utils/formatters';
import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowUpRight } from 'lucide-react';

interface FundCardProps {
  fund: Fund;
  index?: number;
}

export function FundCard({ fund, index = 0 }: FundCardProps) {
  const { currency } = useUserSettings();
  const t = useTranslations('dashboard');
  const tf = useTranslations('nav');
  const config = FUND_CONFIG[fund.id as FundType];
  const Icon = config.icon;
  const progressPct = fund.totalReceived > 0
    ? Math.min(100, (fund.balance / fund.totalReceived) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Link href={config.href}>
        <Card className={cn(
          'border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer',
          config.borderColor
        )}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className={cn('p-2 rounded-lg', config.bgColor)}>
                <Icon className={cn('h-5 w-5', config.color)} />
              </div>
              <div className="flex items-center gap-1">
                <span className={cn('text-xs font-bold', config.color)}>
                  {config.percentage}%
                </span>
                <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
              </div>
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground mt-1">
              {tf(fund.id)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(fund.balance, currency)}</p>
            <div className="mt-3 space-y-1.5">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className={cn('h-full rounded-full', config.bgColor.replace('/10', ''))}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1 + 0.2 }}
                  style={{ background: 'currentColor' }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t('received')}: {formatCurrency(fund.totalReceived, currency)}</span>
                <span>{t('spent')}: {formatCurrency(fund.totalSpent, currency)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
