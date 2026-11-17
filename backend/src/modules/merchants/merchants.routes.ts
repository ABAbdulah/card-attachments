import { Router } from 'express';
import { z } from 'zod';
import { route } from '../../lib/http.js';
import { num } from '../../lib/money.js';
import { prisma } from '../../lib/prisma.js';

export const merchantsRouter = Router();

const querySchema = z.object({ q: z.string().trim().max(60).optional() });

/** Catalog search for the "add a subscription" screen. Only services that bill on a cycle are offered. */
merchantsRouter.get(
  '/',
  route(async (req, res) => {
    const { q } = querySchema.parse(req.query);
    const merchants = await prisma.merchant.findMany({
      where: {
        isSubscriptionService: true,
        ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { category: { contains: q, mode: 'insensitive' } }] } : {}),
      },
      orderBy: { name: 'asc' },
    });
    res.json({
      merchants: merchants.map((m) => ({
        slug: m.slug,
        name: m.name,
        category: m.category,
        billing: m.billing,
        brandColor: m.brandColor,
        manageUrl: m.manageUrl,
        typicalPrice: num(m.typicalPrice) ?? null,
        typicalCurrency: m.typicalCurrency,
        typicalCadence: m.typicalCadence,
      })),
    });
  }),
);
