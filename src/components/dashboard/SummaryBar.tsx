'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { TrendingUp, TrendingDown, DollarSign, PiggyBank } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/formatters';
import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';

interface SummaryBarProps {
  totalBalance: number;
  /**
   * Account-level income and spending — transfers between funds excluded. Named for what they
   * mean, not for the fund counters they derive from: the previous `totalReceived`/`totalSpent`
   * naming is what let fund-level flows get displayed as income and expenses.
   */
  totalIncome: number;
  totalExpenses: number;
}

export function SummaryBar({ totalBalance, totalIncome, totalExpenses }: SummaryBarProps) {
  const { currency } = useUserSettings();
  const t = useTranslations('dashboard');
  const totalSavings = totalBalance;
  const items = [
    { label: t('totalBalance'), value: totalBalance, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: t('totalIncome'), value: totalIncome, icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: t('totalExpenses'), value: totalExpenses, icon: TrendingDown, color: 'text-rose-400', bg: 'bg-rose-500/10' },
    { label: t('netSavings'), value: totalSavings, icon: PiggyBank, color: 'text-violet-400', bg: 'bg-violet-500/10' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
        >
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${item.bg}`}>
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-lg font-bold">{formatCurrency(item.value, currency)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
