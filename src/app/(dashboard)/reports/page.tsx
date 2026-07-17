'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { getRangeReport, RangeReport } from '@/lib/services/reports.service';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';
import { DateRangePicker, DateRange, presetRange } from '@/components/reports/DateRangePicker';
import { InsightsPanel } from '@/components/reports/InsightsPanel';
import { FundHealthCard } from '@/components/reports/FundHealthCard';
import { CategoryBreakdownCard } from '@/components/reports/CategoryBreakdownCard';
import { FUND_CONFIG } from '@/lib/constants/fund-config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Printer, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

function DeltaChip({ current, previous, invert }: { current: number; previous: number; invert?: boolean }) {
  if (previous === 0) return null;
  const delta = ((current - previous) / previous) * 100;
  if (Math.abs(delta) < 1) return null;
  // For expenses, "up" is bad; for income/savings, "up" is good. `invert` flips the coloring.
  const up = delta > 0;
  const good = invert ? !up : up;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', good ? 'text-emerald-400' : 'text-rose-400')}>
      {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(Math.round(delta))}%
    </span>
  );
}

export default function ReportsPage() {
  const { user } = useAuth();
  const { currency } = useUserSettings();

  const [range, setRange] = useState<DateRange>(() => presetRange('this-month'));
  const [activePreset, setActivePreset] = useState<string | null>('this-month');
  const [report, setReport] = useState<RangeReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getRangeReport({ from: range.from, to: range.to })
      .then((res) => {
        if (cancelled) return;
        if (res.success) setReport(res.report);
        else setError(res.error);
      })
      .catch(() => !cancelled && setError('Could not load the report.'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [user, range.from, range.to]);

  const tiles = useMemo(() => {
    if (!report) return [];
    return [
      { label: 'Income', value: report.totalIncome, prev: report.previous.totalIncome, color: 'text-emerald-400', invert: false },
      { label: 'Expenses', value: report.totalExpenses, prev: report.previous.totalExpenses, color: 'text-rose-400', invert: true },
      { label: 'Net Savings', value: report.netSavings, prev: report.previous.netSavings, color: 'text-blue-400', invert: false },
      { label: 'Charity', value: report.totalDonations, prev: 0, color: 'text-amber-400', invert: false },
    ];
  }, [report]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(range.from)} — {formatDate(range.to)}
            {report ? ` · ${report.days} days` : ''}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} disabled={!report}>
          <Printer className="mr-2 h-4 w-4" />
          Print / Save PDF
        </Button>
      </div>

      {/* Print-only header */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold">THULUTH — Report</h1>
        <p className="text-sm">{formatDate(range.from)} — {formatDate(range.to)}</p>
      </div>

      <DateRangePicker
        value={range}
        activePreset={activePreset}
        onChange={(r, preset) => { setRange(r); setActivePreset(preset); }}
      />

      {error ? (
        <Card><CardContent className="py-8 text-center text-sm text-destructive">{error}</CardContent></Card>
      ) : loading || !report ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
          <Skeleton className="h-40 rounded-xl" />
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      ) : (
        <>
          {/* Headline tiles with vs-previous deltas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {tiles.map((t) => (
              <Card key={t.label}>
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{t.label}</p>
                    <DeltaChip current={t.value} previous={t.prev} invert={t.invert} />
                  </div>
                  <p className={cn('text-xl font-bold', t.color)}>{formatCurrency(t.value, currency)}</p>
                  {t.label === 'Net Savings' && (
                    <p className="text-xs text-muted-foreground">{Math.round(report.savingsRate)}% savings rate</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <InsightsPanel insights={report.insights} />

          <div className="grid gap-6 lg:grid-cols-2">
            <FundHealthCard fundHealth={report.fundHealth} />
            <CategoryBreakdownCard categories={report.categories} />
          </div>

          {/* Top expenses */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Largest expenses</CardTitle>
            </CardHeader>
            <CardContent>
              {report.topExpenses.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No expenses in this period.</p>
              ) : (
                <div className="space-y-2">
                  {report.topExpenses.map((e, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{e.description}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {e.category} · {FUND_CONFIG[e.fund].label} · {formatDate(e.date)}
                        </p>
                      </div>
                      <span className="font-semibold tabular-nums text-rose-400 shrink-0">
                        -{formatCurrency(e.amount, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
