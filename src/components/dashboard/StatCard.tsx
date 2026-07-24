'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  /** Two Tailwind classes: text colour then bg tint, e.g. "text-rose-400 bg-rose-500/10". */
  tint: string;
  /** Optional delta chip, e.g. spending vs last month. */
  delta?: { text: string; tone: 'up' | 'down' | 'flat' };
  index?: number;
}

const DELTA_TONE: Record<'up' | 'down' | 'flat', string> = {
  // Spending context: up = worse (rose), down = better (emerald). Callers pick the tone.
  up: 'text-rose-400',
  down: 'text-emerald-400',
  flat: 'text-muted-foreground',
};

/** One animated metric tile. Reused across the dashboard and fund analytics. */
export function StatCard({ label, value, sub, icon: Icon, tint, delta, index = 0 }: StatCardProps) {
  const [text, bg] = tint.split(' ');
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Card className="h-full">
        <CardContent className="pt-5">
          <div className="flex items-start justify-between">
            <div className={cn('inline-flex p-2 rounded-lg mb-3', bg)}>
              <Icon className={cn('h-4 w-4', text)} />
            </div>
            {delta && <span className={cn('text-xs font-medium tabular-nums', DELTA_TONE[delta.tone])}>{delta.text}</span>}
          </div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold truncate" title={value}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>}
        </CardContent>
      </Card>
    </motion.div>
  );
}
