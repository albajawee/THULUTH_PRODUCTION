'use client';

import { FundHealth } from '@/lib/services/reports.service';
import { FUND_CONFIG, FUND_ORDER } from '@/lib/constants/fund-config';
import { formatCurrency } from '@/lib/utils/formatters';
import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Tailwind can't see class names built at runtime, so map fund → static utilization-bar color.
const BAR_COLOR: Record<string, string> = {
  stability: 'bg-blue-500',
  growth: 'bg-emerald-500',
  life: 'bg-violet-500',
  charity: 'bg-amber-500',
};

export function FundHealthCard({ fundHealth }: { fundHealth: FundHealth[] }) {
  const { currency } = useUserSettings();
  const byFund = new Map(fundHealth.map((f) => [f.fund, f]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Fund Health</CardTitle>
        <p className="text-xs text-muted-foreground">
          How much each fund received versus spent this period. Utilization over 100% means the fund
          spent more than it took in.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {FUND_ORDER.map((fundId) => {
          const h = byFund.get(fundId);
          if (!h) return null;
          const config = FUND_CONFIG[fundId];
          const Icon = config.icon;
          const barWidth = Math.min(100, h.utilization);

          return (
            <div key={fundId}>
              <div className="flex items-center gap-2 text-sm">
                <Icon className={cn('h-4 w-4 shrink-0', config.color)} />
                <span className="font-medium">{config.label}</span>
                <span
                  className={cn(
                    'ml-auto text-xs font-semibold tabular-nums',
                    h.overspent ? 'text-rose-400' : 'text-muted-foreground'
                  )}
                >
                  {Math.round(h.utilization)}% used
                </span>
              </div>

              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full', h.overspent ? 'bg-rose-500' : BAR_COLOR[fundId])}
                  style={{ width: `${barWidth}%` }}
                />
              </div>

              <div className="mt-1 flex justify-between text-xs text-muted-foreground tabular-nums">
                <span>Spent {formatCurrency(h.spent, currency)}</span>
                <span>Received {formatCurrency(h.received, currency)}</span>
              </div>
              {h.overspent && (
                <p className="mt-0.5 text-xs text-rose-400">
                  Overspent by {formatCurrency(-h.net, currency)}
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
