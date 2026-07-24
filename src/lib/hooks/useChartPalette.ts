'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { CAT_DARK, CAT_LIGHT } from '../utils/category-segments';

/**
 * The categorical chart palette for the active theme. Falls back to the dark set until the client
 * theme is known, matching the app's default theme so there's no hydration flip.
 */
export function useChartPalette(): string[] {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return !mounted || resolvedTheme !== 'light' ? CAT_DARK : CAT_LIGHT;
}
