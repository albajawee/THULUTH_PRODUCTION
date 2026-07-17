'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { groupThousands } from '@/lib/utils/formatters';

interface MoneyInputProps
  extends Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'type'> {
  /** The numeric value (form state). `undefined` renders an empty field. */
  value: number | undefined;
  /** Emits the parsed number, or `undefined` when the field is empty. */
  onChange: (value: number | undefined) => void;
}

/**
 * A currency input that shows thousand separators while typing (1,000,000) but stores a plain
 * number in form state.
 *
 * It keeps its own display string rather than deriving it from `value`, so a half-typed decimal
 * ("1000." or "10.0") doesn't get collapsed by Number() on every keystroke. inputMode="decimal"
 * gives phones the number pad. A native type="number" can't do any of this — browsers forbid the
 * comma — which is why this is a text input under the hood.
 */
export function MoneyInput({ value, onChange, ...props }: MoneyInputProps) {
  const [display, setDisplay] = useState(() =>
    value === undefined || Number.isNaN(value) ? '' : groupThousands(String(value))
  );

  // Resync when the form changes the value out from under us (e.g. reset() after submit).
  // Guarded so it never fights the user mid-type: only runs when the committed number and the
  // number currently shown actually diverge.
  useEffect(() => {
    const shown = display.replace(/,/g, '');
    const shownNum = shown === '' || shown === '.' ? undefined : Number(shown);
    if (value !== shownNum) {
      setDisplay(value === undefined || Number.isNaN(value) ? '' : groupThousands(String(value)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/,/g, '');
    if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) return; // reject anything but digits + one dot
    setDisplay(groupThousands(raw));
    onChange(raw === '' || raw === '.' ? undefined : Number(raw));
  }

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      value={display}
      onChange={handleChange}
    />
  );
}
