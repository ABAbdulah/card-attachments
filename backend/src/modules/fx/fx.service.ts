import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { num } from '../../lib/money.js';
import { prisma } from '../../lib/prisma.js';

/** Units of each currency per 1 USD. */
export type Rates = Map<string, number>;

const REFRESH_MS = 24 * 60 * 60_000;

/**
 * Used only when the rates API has never been reachable. Approximate; the
 * daily refresh replaces them.
 */
const FALLBACK_PER_USD: Record<string, number> = {
  USD: 1,
  PKR: 281,
  EUR: 0.92,
  GBP: 0.78,
  AED: 3.6725,
  SAR: 3.75,
  INR: 85,
  BDT: 122,
  CAD: 1.38,
  AUD: 1.52,
  TRY: 40,
  EGP: 49,
  NGN: 1550,
  MYR: 4.4,
  QAR: 3.64,
  KWD: 0.307,
  OMR: 0.385,
  BHD: 0.376,
};

let cache: { rates: Rates; loadedAt: number } | undefined;

export async function getRates(): Promise<Rates> {
  if (cache && Date.now() - cache.loadedAt < 60 * 60_000) return cache.rates;

  const stored = await prisma.fxRate.findMany();
  const newest = stored.reduce((max, r) => Math.max(max, r.fetchedAt.getTime()), 0);
  let rates: Rates = new Map(stored.map((r) => [r.currency, num(r.perUsd)]));

  if (env.NODE_ENV !== 'test' && Date.now() - newest > REFRESH_MS) {
    rates = (await refreshRates()) ?? rates;
  }
  if (rates.size === 0) rates = new Map(Object.entries(FALLBACK_PER_USD));

  cache = { rates, loadedAt: Date.now() };
  return rates;
}

async function refreshRates(): Promise<Rates | undefined> {
  try {
    const res = await fetch(env.FX_API_URL, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const body = (await res.json()) as { rates?: Record<string, number> };
    if (!body.rates?.USD) throw new Error('unexpected response');

    const fetchedAt = new Date();
    const entries = Object.entries(body.rates).filter(([code, rate]) => /^[A-Z]{3}$/.test(code) && rate > 0);
    await prisma.$transaction(
      entries.map(([currency, perUsd]) =>
        prisma.fxRate.upsert({ where: { currency }, create: { currency, perUsd, fetchedAt }, update: { perUsd, fetchedAt } }),
      ),
    );
    return new Map(entries);
  } catch (err) {
    logger.warn({ err: String(err) }, 'Exchange rate refresh failed; using stored rates');
    return undefined;
  }
}

export function convert(amount: number, from: string, to: string, rates: Rates): number {
  if (from === to) return amount;
  const fromRate = rates.get(from) ?? FALLBACK_PER_USD[from];
  const toRate = rates.get(to) ?? FALLBACK_PER_USD[to];
  if (!fromRate || !toRate) return amount;
  return (amount / fromRate) * toRate;
}

export const SUPPORTED_CURRENCIES = Object.keys(FALLBACK_PER_USD);

/** Test hook: forget the in-memory cache. */
export function resetRatesCache() {
  cache = undefined;
}
