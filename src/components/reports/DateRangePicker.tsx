'use client';

import { useState } from 'react';
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

const PRESETS: { key: string; label: string }[] = [
  { key: 'this-month', label: 'This month' },
  { key: 'last-month', label: 'Last month' },
  { key: 'last-3', label: 'Last 3 months' },
  { key: 'last-30', label: 'Last 30 days' },
  { key: 'this-year', label: 'This year' },
  { key: 'last-year', label: 'Last year' },
  { key: 'all', label: 'All time' },
];

interface DateRangePickerProps {
  value: DateRange;
  activePreset: string | null;
  onChange: (range: DateRange, preset: string | null) => void;
}

export function DateRangePicker({ value, activePreset, onChange }: DateRangePickerProps) {
  const [showCustom, setShowCustom] = useState(activePreset === null);

  return (
    <div className="space-y-3 print:hidden">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <Button
            key={p.key}
            variant={activePreset === p.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setShowCustom(false); onChange(presetRange(p.key), p.key); }}
          >
            {p.label}
          </Button>
        ))}
        <Button
          variant={activePreset === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowCustom((s) => !s)}
        >
          Custom…
        </Button>
      </div>

      {showCustom && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border/50 p-3">
          <div className="space-y-1">
            <Label htmlFor="from" className="text-xs">From</Label>
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
            <Label htmlFor="to" className="text-xs">To</Label>
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
