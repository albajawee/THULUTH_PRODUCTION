'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { addExpense } from '@/lib/services/expense.service';
import { FUND_ORDER, FUND_CONFIG } from '@/lib/constants/fund-config';
import { CATEGORIES_BY_FUND } from '@/lib/constants/fund-categories';
import { toInputDate } from '@/lib/utils/formatters';
import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';
import { FundType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

interface QuickAddExpenseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Fast expense capture for phones: amount, fund, category — nothing else.
 *
 * Every field the full ExpenseForm asks for that we can reasonably infer, we infer:
 *  - `date` is today (the point is logging a spend as it happens)
 *  - `description` defaults to the category label, because addExpenseSchema requires a non-empty
 *    one and making someone type prose is what makes an app too slow to use at a checkout counter.
 * Anything more considered belongs in the full form on the fund page.
 */
export function QuickAddExpense({ open, onOpenChange }: QuickAddExpenseProps) {
  const { currency } = useUserSettings();
  const [fund, setFund] = useState<FundType>('life');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const categories = CATEGORIES_BY_FUND[fund] ?? [];
  const numericAmount = Number(amount);
  const canSubmit = numericAmount > 0 && category !== '' && !submitting;

  function selectFund(next: FundType) {
    setFund(next);
    setCategory(''); // categories are per-fund; a stale one would be invalid
  }

  function reset() {
    setFund('life');
    setCategory('');
    setAmount('');
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const label = categories.find((c) => c.value === category)?.label ?? 'Expense';
      const result = await addExpense({
        fundType: fund,
        category,
        amount: numericAmount,
        description: label,
        date: toInputDate(),
      });

      if (result.success) {
        toast.success(`${label} · ${numericAmount.toLocaleString()} ${currency}`);
        reset();
        onOpenChange(false);
      } else {
        toast.error('Could not save that expense');
      }
    } catch {
      toast.error('Could not save that expense');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <SheetHeader className="pb-0">
          <SheetTitle>Quick add expense</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-4 pb-2">
          {/* Amount — inputMode=decimal so phones open the number pad, not the qwerty keyboard */}
          <div className="flex items-baseline justify-center gap-2 py-2">
            <span className="text-lg text-muted-foreground">{currency}</span>
            <input
              autoFocus
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '' || /^\d*\.?\d*$/.test(v)) setAmount(v);
              }}
              className="w-40 bg-transparent text-center text-4xl font-semibold tabular-nums outline-none placeholder:text-muted-foreground/40"
              aria-label="Amount"
            />
          </div>

          {/* Fund — 2x2 so every target stays thumb-sized */}
          <div className="grid grid-cols-2 gap-2">
            {FUND_ORDER.map((fundId) => {
              const config = FUND_CONFIG[fundId];
              const Icon = config.icon;
              const active = fund === fundId;
              return (
                <button
                  key={fundId}
                  type="button"
                  onClick={() => selectFund(fundId)}
                  aria-pressed={active}
                  className={cn(
                    'flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border/60 text-muted-foreground hover:bg-muted'
                  )}
                >
                  <Icon className={cn('h-4 w-4 shrink-0', config.color)} />
                  {config.label}
                </button>
              );
            })}
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const active = category === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  aria-pressed={active}
                  className={cn(
                    'min-h-9 rounded-full border px-3.5 py-1.5 text-sm transition-colors',
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border/60 text-muted-foreground hover:bg-muted'
                  )}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          <Button
            className="h-12 w-full text-base"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {submitting ? 'Saving…' : 'Add expense'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
