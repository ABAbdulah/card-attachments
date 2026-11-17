import { prisma } from '../../lib/prisma.js';
import { CATALOG } from './catalog.js';

/** Writes the in-code catalog to the merchants table. Safe to run repeatedly. */
export async function seedMerchants() {
  for (const m of CATALOG) {
    const data = {
      name: m.name,
      category: m.category,
      billing: m.billing,
      isSubscriptionService: m.billing !== 'PURCHASE',
      descriptorPatterns: m.patterns,
      manageUrl: m.manageUrl ?? null,
      brandColor: m.brandColor ?? null,
      typicalPrice: m.typical?.price ?? null,
      typicalCurrency: m.typical?.currency ?? null,
      typicalCadence: m.typical?.cadence ?? null,
    };
    await prisma.merchant.upsert({ where: { slug: m.slug }, create: { slug: m.slug, ...data }, update: data });
  }
  return CATALOG.length;
}

export async function merchantIdsBySlug(): Promise<Map<string, string>> {
  const rows = await prisma.merchant.findMany({ select: { id: true, slug: true } });
  return new Map(rows.map((r) => [r.slug, r.id]));
}
