import { Router } from 'express';
import { z } from 'zod';
import { param, route, userId } from '../../lib/http.js';
import { isoDay, num, round2 } from '../../lib/money.js';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../middleware/error.js';
import { convert, getRates } from '../fx/fx.service.js';
import { CATALOG_BY_SLUG } from '../merchants/catalog.js';
import { getUserOrThrow } from '../users/users.service.js';

export const cardsRouter = Router();

const cardSchema = z.object({
  nickname: z.string().trim().min(1).max(40),
  bank: z.string().trim().max(60).nullable().optional(),
  last4: z.string().regex(/^\d{4}$/, 'Use the last 4 digits only').nullable().optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).default('PKR'),
});

async function ownedCard(userIdValue: string, id: string) {
  const card = await prisma.card.findFirst({ where: { id, userId: userIdValue } });
  if (!card) throw new HttpError(404, 'Card not found.', 'NOT_FOUND');
  return card;
}

cardsRouter.get(
  '/',
  route(async (req, res) => {
    const cards = await prisma.card.findMany({
      where: { userId: userId(req) },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { subscriptions: { where: { status: 'ACTIVE' } }, statements: true } },
        statements: { orderBy: { periodEnd: 'desc' }, take: 1, select: { periodEnd: true } },
      },
    });
    res.json({
      cards: cards.map((c) => ({
        id: c.id,
        nickname: c.nickname,
        bank: c.bank,
        last4: c.last4,
        currency: c.currency,
        activeSubscriptions: c._count.subscriptions,
        statements: c._count.statements,
        coveredUntil: c.statements[0] ? isoDay(c.statements[0].periodEnd) : null,
      })),
    });
  }),
);

cardsRouter.post(
  '/',
  route(async (req, res) => {
    const data = cardSchema.parse(req.body);
    const card = await prisma.card.create({ data: { ...data, userId: userId(req) } });
    res.status(201).json({ card });
  }),
);

cardsRouter.patch(
  '/:id',
  route(async (req, res) => {
    await ownedCard(userId(req), param(req, 'id'));
    const card = await prisma.card.update({ where: { id: param(req, 'id') }, data: cardSchema.partial().parse(req.body) });
    res.json({ card });
  }),
);

cardsRouter.delete(
  '/:id',
  route(async (req, res) => {
    await ownedCard(userId(req), param(req, 'id'));
    await prisma.card.delete({ where: { id: param(req, 'id') } });
    res.status(204).end();
  }),
);

/**
 * Card exposure: every merchant that has charged the user's cards, so they can
 * see where the card is saved, including one-off shops.
 */
cardsRouter.get(
  '/exposure',
  route(async (req, res) => {
    const user = await getUserOrThrow(userId(req));
    const [transactions, subscriptions, rates] = await Promise.all([
      prisma.transaction.findMany({
        where: { card: { userId: user.id } },
        include: { card: { select: { id: true, nickname: true, currency: true } } },
        orderBy: { date: 'desc' },
      }),
      prisma.subscription.findMany({ where: { userId: user.id }, select: { id: true, merchantKey: true, status: true } }),
      getRates(),
    ]);
    const tracked = new Map(subscriptions.filter((s) => s.merchantKey).map((s) => [s.merchantKey!, s]));

    const groups = new Map<
      string,
      { key: string; name: string; count: number; total: number; lastCharge: string; firstCharge: string; cards: Set<string> }
    >();
    for (const tx of transactions) {
      const amount = convert(num(tx.amountLocal), tx.card.currency, user.homeCurrency, rates);
      const day = isoDay(tx.date);
      const group = groups.get(tx.merchantKey);
      if (group) {
        group.count++;
        group.total += amount;
        group.firstCharge = day;
        group.cards.add(tx.card.nickname);
      } else {
        groups.set(tx.merchantKey, {
          key: tx.merchantKey,
          name: tx.merchantName,
          count: 1,
          total: amount,
          lastCharge: day,
          firstCharge: day,
          cards: new Set([tx.card.nickname]),
        });
      }
    }

    res.json({
      currency: user.homeCurrency,
      merchants: [...groups.values()].map((g) => {
        const catalog = CATALOG_BY_SLUG.get(g.key);
        const sub = tracked.get(g.key);
        return {
          key: g.key,
          name: g.name,
          category: catalog?.category ?? null,
          brandColor: catalog?.brandColor ?? null,
          manageUrl: catalog?.manageUrl ?? null,
          billing: catalog?.billing ?? null,
          chargeCount: g.count,
          total: round2(g.total),
          firstCharge: g.firstCharge,
          lastCharge: g.lastCharge,
          cards: [...g.cards],
          subscriptionId: sub?.id ?? null,
          subscriptionStatus: sub?.status ?? null,
        };
      }),
    });
  }),
);
