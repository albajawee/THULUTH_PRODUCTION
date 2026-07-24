import type { LucideIcon } from 'lucide-react';
import { Tag } from 'lucide-react';
import { CategoryAggregate } from '../types';
import { iconForCategory } from './category-icons';

// Validated categorical order (dataviz skill; validator passes both light and dark). Assigned by
// rank; the tail past six folds into a neutral "Other" so hues are never cycled.
export const CAT_DARK = ['#3987e5', '#008300', '#d55181', '#c98500', '#199e70', '#d95926'];
export const CAT_LIGHT = ['#2a78d6', '#008300', '#e87ba4', '#eda100', '#1baf7a', '#eb6834'];
export const OTHER_COLOR = '#898781';
const DEFAULT_TOP_N = 6;

export interface CategorySegment {
  name: string;
  total: number;
  count: number;
  color: string;
  icon: LucideIcon;
}

/**
 * Turns a category aggregate map into ranked, coloured segments for the donut and bars — shared by
 * the per-fund analytics and the dashboard so both render identically. The top `topN` by total
 * keep their own hue; everything past that collapses into a single neutral "Other".
 */
export function buildCategorySegments(
  categories: Record<string, CategoryAggregate>,
  palette: string[],
  otherLabel: string,
  topN = DEFAULT_TOP_N
): CategorySegment[] {
  const ranked = Object.entries(categories)
    .filter(([, v]) => v.total > 0)
    .sort((a, b) => b[1].total - a[1].total);

  const segments: CategorySegment[] = ranked.slice(0, topN).map(([name, v], i) => ({
    name,
    total: v.total,
    count: v.count,
    color: palette[i % palette.length],
    icon: iconForCategory(name),
  }));

  const rest = ranked.slice(topN);
  if (rest.length > 0) {
    segments.push({
      name: otherLabel,
      total: rest.reduce((s, [, v]) => s + v.total, 0),
      count: rest.reduce((s, [, v]) => s + v.count, 0),
      color: OTHER_COLOR,
      icon: Tag,
    });
  }
  return segments;
}
