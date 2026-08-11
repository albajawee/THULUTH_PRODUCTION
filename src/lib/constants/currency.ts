/**
 * The fallback currency, used only until the user's real one is known (first paint, missing
 * profile field). It lives here as one constant rather than as a literal repeated across the
 * formatter, the provider, the layout and the settings form — a stray `'SAR'` default in a
 * component prop is exactly how the distribution preview ended up showing Riyals to a user who
 * had picked Dinars.
 */
export const DEFAULT_CURRENCY = 'SAR';

/**
 * Smallest denomination that physically exists, for currencies where the sub-unit is not spendable.
 *
 * Iraq's smallest circulating banknote is the 250 dinar note, and there are no coins — so a fund
 * share of 5,650 IQD cannot be handed over, counted, or withdrawn. Splitting income into amounts
 * below this base produces numbers that look precise but can't be acted on, which is worse than
 * useless in a budgeting app.
 *
 * Add a currency here only when its smallest usable denomination is genuinely larger than 1 unit.
 */
export const CURRENCY_NOTE_BASE: Record<string, number> = {
  IQD: 250,
};

/** True when this currency has a note base worth rounding to — i.e. the toggle is meaningful. */
export function hasNoteBase(currency: string): boolean {
  return CURRENCY_NOTE_BASE[currency] !== undefined;
}

/**
 * The rounding step to distribute income in, for a currency and the user's preference.
 *
 * Returns 1 (i.e. no rounding) for currencies with no note base, or when the user has switched
 * the preference off. `enabled` defaults to true so a profile saved before this setting existed
 * gets the sane behaviour rather than the raw one.
 */
export function noteBaseFor(currency: string, enabled: boolean | undefined = true): number {
  if (enabled === false) return 1;
  return CURRENCY_NOTE_BASE[currency] ?? 1;
}
