import type { Cadence } from '../merchants/catalog.js';

/** How many charges per month each cadence produces. */
export const PER_MONTH: Record<Cadence, number> = {
  WEEKLY: 52 / 12,
  MONTHLY: 1,
  QUARTERLY: 1 / 3,
  YEARLY: 1 / 12,
};

const STEP_MONTHS: Partial<Record<Cadence, number>> = { MONTHLY: 1, QUARTERLY: 3, YEARLY: 12 };

/**
 * The k-th renewal after (k > 0) or before (k < 0) the anchor date. Monthly
 * steps keep the anchor's day of month, clamped to shorter months, so a plan
 * billed on the 31st renews on 28/29 Feb and back on 31 Mar.
 */
export function renewalAt(anchor: string, cadence: Cadence, k: number): string {
  const [y, m, d] = anchor.split('-').map(Number) as [number, number, number];
  const months = STEP_MONTHS[cadence];
  if (months === undefined) {
    const date = new Date(Date.UTC(y, m - 1, d + 7 * k));
    return date.toISOString().slice(0, 10);
  }
  const total = m - 1 + months * k;
  const year = y + Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(d, lastDay))).toISOString().slice(0, 10);
}

/** Index of the first renewal on or after `from`, counted from the anchor. */
function firstIndexFrom(anchor: string, cadence: Cadence, from: string): number {
  let k = 0;
  // Walk back if the anchor is after `from`, then forward to the first date >= from.
  while (renewalAt(anchor, cadence, k - 1) >= from) k--;
  while (renewalAt(anchor, cadence, k) < from) k++;
  return k;
}

/** First renewal on or after `from`. */
export function nextRenewal(anchor: string, cadence: Cadence, from: string): string {
  return renewalAt(anchor, cadence, firstIndexFrom(anchor, cadence, from));
}

/** Every renewal date within [start, end], inclusive. Always stepped from the anchor so the billing day never drifts. */
export function renewalsBetween(anchor: string, cadence: Cadence, start: string, end: string): string[] {
  const dates: string[] = [];
  for (let k = firstIndexFrom(anchor, cadence, start); renewalAt(anchor, cadence, k) <= end; k++) {
    dates.push(renewalAt(anchor, cadence, k));
  }
  return dates;
}
