'use client';

import { useTranslations } from 'next-intl';
import { ReportInsight } from '@/lib/services/reports.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, TrendingUp, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const TONE = {
  good: { icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  warn: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10' },
} as const;

export function InsightsPanel({ insights }: { insights: ReportInsight[] }) {
  const t = useTranslations('reports');
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-400" />
          {t('conclusions')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('notEnough')}</p>
        ) : (
          <ul className="space-y-2">
            {insights.map((insight, i) => {
              const t = TONE[insight.tone];
              const Icon = t.icon;
              return (
                <li key={i} className="flex items-start gap-3">
                  <span className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full', t.bg)}>
                    <Icon className={cn('h-3.5 w-3.5', t.color)} />
                  </span>
                  <span className="text-sm leading-relaxed">{insight.text}</span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
