'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/lib/hooks/useAuth';
import { useIncome } from '@/lib/hooks/useIncome';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { reverseIncome } from '@/lib/services/income.service';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Wallet, Trash2 } from 'lucide-react';
import { FUND_CONFIG } from '@/lib/constants/fund-config';
import { FundType, Income } from '@/lib/types';
import { cn } from '@/lib/utils';

import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';

export default function IncomePage() {
  const { user } = useAuth();
  const { incomes, loading } = useIncome(user?.uid ?? null);
  const { currency } = useUserSettings();

  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);

  async function handleDelete(income: Income) {
    const result = await reverseIncome({ incomeId: income.id });
    if (result.success) {
      toast.success('Income entry removed');
    } else {
      toast.error(result.error ?? 'Could not remove the income');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Income</h1>
          <p className="text-muted-foreground text-sm">
            Total: {formatCurrency(totalIncome, currency)}
          </p>
        </div>
        <Link href="/income/add" className={buttonVariants()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Income
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Income History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : incomes.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No income recorded yet</p>
              <Link href="/income/add" className={buttonVariants({ variant: 'outline', size: 'sm' })}>Add your first income</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {incomes.map((income) => (
                <div key={income.id} className="flex items-start gap-4 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{income.source}</p>
                      <Badge variant="outline" className="text-xs">{formatDate(income.date)}</Badge>
                      <ConfirmDialog
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="ml-auto text-muted-foreground hover:text-destructive"
                            aria-label="Delete income"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        }
                        title="Delete this income?"
                        description={`This removes ${formatCurrency(income.amount, currency)} and pulls each fund's share back out. It only works if none of it has been spent yet. The ledger records the reversal.`}
                        confirmLabel="Delete income"
                        destructive
                        onConfirm={() => handleDelete(income)}
                      />
                    </div>
                    <p className="text-2xl font-bold text-emerald-400">{formatCurrency(income.amount, currency)}</p>
                    {income.note && (
                      <p className="text-sm text-muted-foreground mt-1">{income.note}</p>
                    )}
                    <div className="flex gap-3 mt-2 flex-wrap">
                      {(['stability', 'growth', 'life', 'charity'] as FundType[]).map((fund) => {
                        const config = FUND_CONFIG[fund];
                        return (
                          <span key={fund} className={cn('text-xs px-2 py-0.5 rounded-full border', config.bgColor, config.borderColor, config.color)}>
                            {config.label}: {formatCurrency(income.distributions[fund], currency)}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
