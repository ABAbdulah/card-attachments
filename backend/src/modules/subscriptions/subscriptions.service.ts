import type { Card, Merchant, Subscription } from '../../generated/prisma/client.js';
import { isoDay, num, todayIso } from '../../lib/money.js';
import type { Rates } from '../fx/fx.service.js';
import { CATALOG_BY_SLUG } from '../merchants/catalog.js';
import { costInHome } from './pricing.js';
import { nextRenewal } from './schedule.js';

export type SubscriptionWithRelations = Subscription & { merchant: Merchant | null; card: Card | null };

/** The date renewals are counted from: the stored next renewal, else the last charge. */
export function anchorOf(sub: Pick<Subscription, 'nextRenewal' | 'lastChargedAt'>): string | undefined {
  const date = sub.nextRenewal ?? sub.lastChargedAt;
  return date ? isoDay(date) : undefined;
}

export function serializeSubscription(sub: SubscriptionWithRelations, homeCurrency: string, rates: Rates, today = todayIso()) {
  const catalog = sub.merchant ? CATALOG_BY_SLUG.get(sub.merchant.slug) : undefined;
  const anchor = anchorOf(sub);
  return {
    id: sub.id,
    name: sub.name,
    merchantSlug: sub.merchant?.slug ?? null,
    category: sub.category ?? sub.merchant?.category ?? null,
    brandColor: sub.merchant?.brandColor ?? null,
    manageUrl: sub.merchant?.manageUrl ?? catalog?.manageUrl ?? null,
    billing: sub.merchant?.billing ?? null,
    cadence: sub.cadence,
    priceOriginal: num(sub.priceOriginal),
    currency: sub.currency,
    status: sub.status,
    source: sub.source,
    confidence: sub.confidence,
    card: sub.card ? { id: sub.card.id, nickname: sub.card.nickname, currency: sub.card.currency } : null,
    lastChargedLocal: num(sub.lastChargedLocal) ?? null,
    lastChargedAt: sub.lastChargedAt ? isoDay(sub.lastChargedAt) : null,
    nextRenewal: sub.status === 'ACTIVE' && anchor ? nextRenewal(anchor, sub.cadence, today) : null,
    cost: costInHome(sub, homeCurrency, rates),
    cancelledAt: sub.cancelledAt?.toISOString() ?? null,
    verifiedAt: sub.verifiedAt?.toISOString() ?? null,
    notes: sub.notes,
    createdAt: sub.createdAt.toISOString(),
  };
}

export type SerializedSubscription = ReturnType<typeof serializeSubscription>;
