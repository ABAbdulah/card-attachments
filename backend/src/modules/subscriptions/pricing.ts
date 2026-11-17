import { num, round2 } from '../../lib/money.js';
import { convert, type Rates } from '../fx/fx.service.js';
import type { Cadence } from '../merchants/catalog.js';
import { PER_MONTH } from './schedule.js';

export type PricedInput = {
  cadence: Cadence;
  priceOriginal: { toNumber(): number } | number;
  currency: string;
  lastChargedLocal?: { toNumber(): number } | number | null;
  card?: { currency: string } | null;
};

export type Cost = {
  /** One charge in the home currency. */
  perCharge: number;
  monthly: number;
  yearly: number;
  /**
   * actual:    the amount the bank really took, from a statement
   * estimated: the listed price converted at the market rate (bank fees not included)
   */
  basis: 'actual' | 'estimated';
};

export function costInHome(sub: PricedInput, homeCurrency: string, rates: Rates): Cost {
  const charged = num(sub.lastChargedLocal);
  const actual = charged !== undefined && sub.card?.currency === homeCurrency;
  const perCharge = actual ? charged : convert(num(sub.priceOriginal), sub.currency, homeCurrency, rates);
  const monthly = perCharge * PER_MONTH[sub.cadence];
  return {
    perCharge: round2(perCharge),
    monthly: round2(monthly),
    yearly: round2(monthly * 12),
    basis: actual ? 'actual' : 'estimated',
  };
}
