'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  startOfMonth, endOfMonth, startOfYear, endOfYear,
  subMonths, subDays, format,
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface DateRange {
  from: string; // yyyy-MM-dd
  to: string;   // yyyy-MM-dd
}

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

/** Preset ranges. `all` uses a far-past start so it captures the entire history. */
function presetRange(key: string): DateRange {
  const now = new Date();
  switch (key) {
    case 'this-month': return { from: fmt(startOfMonth(now)), to: fmt(endOfMonth(now)) };
    case 'last-month': {
      const m = subMonths(now, 1);
      return { from: fmt(startOfMonth(m)), to: fmt(endOfMonth(m)) };
    }
    case 'last-3': return { from: fmt(startOfMonth(subMonths(now, 2))), to: fmt(endOfMonth(now)) };
    case 'last-30': return { from: fmt(subDays(now, 29)), to: fmt(now) };
    case 'this-year': return { from: fmt(startOfYear(now)), to: fmt(endOfYear(now)) };
    case 'last-year': {
      const y = new Date(now.getFullYear() - 1, 0, 1);
      return { from: fmt(startOfYear(y)), to: fmt(endOfYear(y)) };
    }
    case 'all': return { from: '2000-01-01', to: fmt(now) };
    default: return { from: fmt(startOfMonth(now)), to: fmt(endOfMonth(now)) };
  }
}

const PRESETS: { key: string; labelKey: string }[] = [
  { key: 'this-month', labelKey: 'thisMonth' },
  { key: 'last-month', labelKey: 'lastMonth' },
  { key: 'last-3', labelKey: 'last3Months' },
  { key: 'last-30', labelKey: 'last30Days' },
  { key: 'this-year', labelKey: 'thisYear' },
  { key: 'last-year', labelKey: 'lastYear' },
  { key: 'all', labelKey: 'allTime' },
];

interface DateRangePickerProps {
  value: DateRange;
  activePreset: string | null;
  onChange: (range: DateRange, preset: string | null) => void;
}

export function DateRangePicker({ value, activePreset, onChange }: DateRangePickerProps) {
  const t = useTranslations('reports');
  const [showCustom, setShowCustom] = useState(activePreset === null);

  return (
    <div className="space-y-3 print:hidden">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset.key}
            variant={activePreset === preset.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setShowCustom(false); onChange(presetRange(preset.key), preset.key); }}
          >
            {t(preset.labelKey)}
          </Button>
        ))}
        <Button
          variant={activePreset === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowCustom((s) => !s)}
        >
          {t('custom')}
        </Button>
      </div>

      {showCustom && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border/50 p-3">
          <div className="space-y-1">
            <Label htmlFor="from" className="text-xs">{t('from')}</Label>
            <Input
              id="from"
              type="date"
              value={value.from}
              max={value.to}
              className="w-40"
              onChange={(e) => e.target.value && onChange({ ...value, from: e.target.value }, null)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to" className="text-xs">{t('to')}</Label>
            <Input
              id="to"
              type="date"
              value={value.to}
              min={value.from}
              className="w-40"
              onChange={(e) => e.target.value && onChange({ ...value, to: e.target.value }, null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export { presetRange };
