/**
 * Formats a number as currency using Intl.NumberFormat.
 * Falls back to 'USD' if no currency is provided.
 */
export function formatCurrency(
  amount: number,
  currency = 'SAR',
  locale = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats a date string to a readable format.
 */
export function formatDate(dateString: string, locale = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateString));
}

/**
 * Formats a date string to YYYY-MM-DD for input fields.
 */
export function toInputDate(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/**
 * Returns relative time string (e.g., "2 days ago").
 */
export function formatRelativeTime(dateString: string, locale = 'en-US'): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const diff = new Date(dateString).getTime() - Date.now();
  const days = Math.round(diff / (1000 * 60 * 60 * 24));
  if (Math.abs(days) < 1) return 'today';
  if (Math.abs(days) < 30) return rtf.format(days, 'day');
  if (Math.abs(days) < 365) return rtf.format(Math.round(days / 30), 'month');
  return rtf.format(Math.round(days / 365), 'year');
}

/**
 * Formats a percentage number.
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
