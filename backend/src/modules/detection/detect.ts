import type { Billing, Cadence } from '../merchants/catalog.js';
import { resolveMerchant } from '../merchants/resolve.js';
import type { ParsedTransaction } from '../statements/types.js';

export type { Cadence };
export type Verdict = 'CONFIRMED' | 'LIKELY' | 'CHECK' | 'NOT_SUBSCRIPTION';

/** A card charge with its merchant already resolved. Amounts are positive. */
export type Charge = {
  date: string;
  description: string;
  amountLocal: number;
  amountOriginal?: number;
  originalCurrency?: string;
  merchantKey: string;
  merchantName: string;
  merchantSlug?: string;
  billing?: Billing;
};

export type Detection = {
  merchantKey: string;
  merchant: string;
  merchantSlug?: string;
  billing?: Billing;
  verdict: Verdict;
  reason: string;
  cadence?: Cadence;
  charges: number;
  firstCharge: string;
  lastCharge: string;
  /** What the bank actually took for the latest charge, in the account currency. */
  lastAmountLocal: number;
  priceOriginal?: number;
  originalCurrency?: string;
  /** Latest charge scaled to one month; only set for CONFIRMED and LIKELY. */
  monthlyCostLocal?: number;
};

export const CADENCE_DAYS: Record<Cadence, number> = { WEEKLY: 7, MONTHLY: 30, QUARTERLY: 91, YEARLY: 365 };

/** Allowed gap between charges, in days. */
const STRICT_WINDOWS: Record<Cadence, [number, number]> = {
  WEEKLY: [6, 8],
  MONTHLY: [27, 34],
  QUARTERLY: [85, 95],
  YEARLY: [355, 375],
};
/**
 * Known subscription services get a wider monthly window: retries after a
 * failed payment and re-subscribing shift the billing day by a week or more.
 */
const LENIENT_WINDOWS: Record<Cadence, [number, number]> = { ...STRICT_WINDOWS, MONTHLY: [20, 40] };

/** Share of gaps that must fit the cadence. */
const MIN_REGULAR_SHARE = 0.6;
/** A fixed-price subscription may drift this much (exchange-rate movement). */
const AMOUNT_TOLERANCE = 0.1;
/** A single charge this recent is treated as a new subscription, not a one-off. */
const NEW_SUBSCRIPTION_DAYS = 35;

export function chargesFromParsed(transactions: ParsedTransaction[]): Charge[] {
  return transactions
    .filter((tx) => tx.kind === 'card' && tx.amountLocal < 0)
    .map((tx) => {
      const merchant = resolveMerchant(tx.description);
      return {
        date: tx.date,
        description: tx.description,
        amountLocal: Math.abs(tx.amountLocal),
        amountOriginal: tx.amountOriginal,
        originalCurrency: tx.originalCurrency,
        merchantKey: merchant.key,
        merchantName: merchant.name,
        merchantSlug: merchant.slug,
        billing: merchant.billing,
      };
    });
}

export function detectSubscriptions(charges: Charge[], asOf: string): Detection[] {
  const groups = new Map<string, Charge[]>();
  for (const charge of charges) {
    groups.set(charge.merchantKey, [...(groups.get(charge.merchantKey) ?? []), charge]);
  }

  const order: Verdict[] = ['CONFIRMED', 'LIKELY', 'CHECK', 'NOT_SUBSCRIPTION'];
  return [...groups.values()]
    .map((group) => classify(group, asOf))
    .sort((a, b) => order.indexOf(a.verdict) - order.indexOf(b.verdict) || a.merchant.localeCompare(b.merchant));
}

function classify(unsorted: Charge[], asOf: string): Detection {
  const charges = [...unsorted].sort((a, b) => a.date.localeCompare(b.date));
  const first = charges[0]!;
  const last = charges[charges.length - 1]!;
  const { billing } = last;
  const n = charges.length;
  const gaps = charges.slice(1).map((c, i) => daysBetween(charges[i]!.date, c.date));
  const sinceLast = daysBetween(last.date, asOf);

  const base = {
    merchantKey: last.merchantKey,
    merchant: last.merchantName,
    merchantSlug: last.merchantSlug,
    billing,
    charges: n,
    firstCharge: first.date,
    lastCharge: last.date,
    lastAmountLocal: last.amountLocal,
    priceOriginal: last.amountOriginal,
    originalCurrency: last.originalCurrency,
  };
  const result = (verdict: Verdict, reason: string, cadence?: Cadence): Detection => ({
    ...base,
    verdict,
    reason,
    cadence,
    monthlyCostLocal:
      cadence && (verdict === 'CONFIRMED' || verdict === 'LIKELY')
        ? round2((base.lastAmountLocal * CADENCE_DAYS.MONTHLY) / CADENCE_DAYS[cadence])
        : undefined,
  });

  if (billing === 'PURCHASE') {
    return result('NOT_SUBSCRIPTION', 'This merchant sells one-off purchases, not subscriptions.');
  }

  if (billing) {
    const cadence = findCadence(gaps, LENIENT_WINDOWS);
    if (cadence) {
      const stopped = sinceLast > CADENCE_DAYS[cadence] * 1.5;
      const detail = billing === 'USAGE' ? ' The amount changes with usage.' : '';
      return stopped
        ? result('CHECK', `Charged ${n} times ${cadence.toLowerCase()}, but nothing since ${last.date}. It may already be cancelled.`)
        : result('CONFIRMED', `Charged ${n} times, ${cadence.toLowerCase()}.${detail}`, cadence);
    }
    if (n > 1) {
      return result('CHECK', `Known subscription service, charged ${n} times at irregular intervals.`);
    }
    if (billing === 'USAGE') {
      return result('CHECK', `Pay-as-you-go service, charged once on ${last.date}.`);
    }
    return sinceLast <= NEW_SUBSCRIPTION_DAYS
      ? result('LIKELY', `Known subscription service, first charged on ${last.date}. Looks like a new subscription.`, 'MONTHLY')
      : result('CHECK', `Charged once on ${last.date} and not renewed since. A one-off, a yearly plan or already cancelled.`);
  }

  const cadence = findCadence(gaps, STRICT_WINDOWS);
  if (n >= 3 && cadence && amountsAreStable(charges)) {
    return result('LIKELY', `Unknown merchant charging the same amount ${cadence.toLowerCase()} (${n} times).`, cadence);
  }
  if (last.merchantKey.startsWith('google-play:')) {
    return result('CHECK', 'Google Play charge: an app purchase or an app subscription billed through Google.');
  }
  return result('NOT_SUBSCRIPTION', n > 1 ? `Charged ${n} times with no regular cycle.` : 'Single purchase.');
}

function findCadence(gaps: number[], windows: Record<Cadence, [number, number]>): Cadence | undefined {
  if (gaps.length === 0) return undefined;
  return (Object.keys(windows) as Cadence[]).find((cadence) => {
    const [min, max] = windows[cadence];
    const fitting = gaps.filter((g) => g >= min && g <= max).length;
    return fitting / gaps.length >= MIN_REGULAR_SHARE;
  });
}

function amountsAreStable(charges: Charge[]): boolean {
  const amounts = charges.map((c) => c.amountOriginal ?? c.amountLocal).sort((a, b) => a - b);
  const median = amounts[Math.floor(amounts.length / 2)]!;
  return amounts.every((a) => Math.abs(a - median) / median <= AMOUNT_TOLERANCE);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
