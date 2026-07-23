'use client';

import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Expense } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';
import { reverseExpense } from '@/lib/services/expense.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Receipt, Trash2, Loader2 } from 'lucide-react';

interface ExpenseHistoryProps {
  expenses: Expense[];
  loading?: boolean;
  /** True when more expenses exist beyond the ones currently loaded. */
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

export function ExpenseHistory({ expenses, loading, hasMore, loadingMore, onLoadMore }: ExpenseHistoryProps) {
  const { currency } = useUserSettings();
  const t = useTranslations('funds');
  const tf = useTranslations('nav');

  async function handleDelete(expense: Expense) {
    const result = await reverseExpense({ expenseId: expense.id });
    if (result.success) {
      toast.success(t('expenseRefunded', { amount: formatCurrency(expense.amount, currency) }));
    } else {
      toast.error(result.error ?? t('expenseDeleteFailed'));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('expenseHistory')}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-10">
            <Receipt className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t('noExpenses')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-1 min-w-0">
                    {/* Description is optional — omit the line entirely rather than leaving an
                        empty one; the category badge below still identifies the row. */}
                    {expense.description && (
                      <p className="text-sm font-medium truncate">{expense.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs capitalize">
                        {expense.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(expense.date)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-3 shrink-0">
                  <span className="text-sm font-semibold text-rose-400 tabular-nums">
                    -{formatCurrency(expense.amount, currency)}
                  </span>
                  <ConfirmDialog
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={t('deleteExpense')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    }
                    title={t('deleteExpenseTitle')}
                    description={t('deleteExpenseDesc', { amount: formatCurrency(expense.amount, currency), fund: tf(expense.fundType) })}
                    confirmLabel={t('deleteExpense')}
                    destructive
                    onConfirm={() => handleDelete(expense)}
                  />
                </div>
              </div>
            ))}

            {hasMore && onLoadMore && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={loadingMore}
                  onClick={onLoadMore}
                >
                  {loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loadingMore ? t('loadingMore') : t('loadMore')}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
