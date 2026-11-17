import { Router } from 'express';
import { z } from 'zod';
import { param, route, userId } from '../../lib/http.js';
import { dayToDate, isoDay, num } from '../../lib/money.js';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../middleware/error.js';
import { reward } from '../gamification/gamification.service.js';
import { getRates } from '../fx/fx.service.js';
import { CATALOG_BY_SLUG } from '../merchants/catalog.js';
import { assertWithinPlan, getUserOrThrow } from '../users/users.service.js';
import { serializeSubscription } from './subscriptions.service.js';

export const subscriptionsRouter = Router();

const include = { merchant: true, card: true } as const;
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

const createSchema = z.object({
  merchantSlug: z.string().optional(),
  name: z.string().trim().min(1).max(60),
  cadence: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
  priceOriginal: z.number().positive().max(1e9),
  currency: z.string().regex(/^[A-Z]{3}$/),
  nextRenewal: day,
  /** Free trial: the day it becomes paid. The first charge then falls on this day. */
  trialEndsAt: day.nullable().optional(),
  cardId: z.string().uuid().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

async function ownedSubscription(user: string, id: string) {
  const sub = await prisma.subscription.findFirst({ where: { id, userId: user }, include });
  if (!sub) throw new HttpError(404, 'Subscription not found.', 'NOT_FOUND');
  return sub;
}

async function assertCard(user: string, cardId: string | null | undefined) {
  if (!cardId) return;
  const card = await prisma.card.findFirst({ where: { id: cardId, userId: user } });
  if (!card) throw new HttpError(400, 'That card does not belong to you.', 'VALIDATION');
}

subscriptionsRouter.get(
  '/',
  route(async (req, res) => {
    const user = await getUserOrThrow(userId(req));
    const status = z.enum(['ACTIVE', 'CANCELLED']).optional().parse(req.query.status);
    const [subs, rates] = await Promise.all([
      prisma.subscription.findMany({ where: { userId: user.id, ...(status ? { status } : {}) }, include, orderBy: { createdAt: 'asc' } }),
      getRates(),
    ]);
    const items = subs.map((s) => serializeSubscription(s, user.homeCurrency, rates));
    items.sort((a, b) => (a.status === b.status ? b.cost.monthly - a.cost.monthly : a.status === 'ACTIVE' ? -1 : 1));
    res.json({ currency: user.homeCurrency, subscriptions: items });
  }),
);

subscriptionsRouter.post(
  '/',
  route(async (req, res) => {
    const user = await getUserOrThrow(userId(req));
    const body = createSchema.parse(req.body);
    await assertWithinPlan(user, 'manualSubscriptions');
    await assertCard(user.id, body.cardId);

    const catalog = body.merchantSlug ? CATALOG_BY_SLUG.get(body.merchantSlug) : undefined;
    const merchant = catalog ? await prisma.merchant.findUnique({ where: { slug: catalog.slug } }) : null;
    const merchantKey = catalog?.slug ?? body.name.toLowerCase();

    const duplicate = await prisma.subscription.findFirst({ where: { userId: user.id, merchantKey, status: 'ACTIVE' } });
    if (duplicate) throw new HttpError(409, `${duplicate.name} is already on your list.`, 'DUPLICATE');

    const sub = await prisma.subscription.create({
      data: {
        userId: user.id,
        merchantId: merchant?.id,
        merchantKey,
        name: body.name,
        category: catalog?.category,
        cadence: body.cadence,
        priceOriginal: body.priceOriginal,
        currency: body.currency,
        nextRenewal: dayToDate(body.trialEndsAt ?? body.nextRenewal),
        trialEndsAt: body.trialEndsAt ? dayToDate(body.trialEndsAt) : null,
        cardId: body.cardId ?? null,
        notes: body.notes ?? null,
        source: 'MANUAL',
      },
      include,
    });
    const rewards = await reward(user.id, [{ type: 'ADD_MANUAL', refId: sub.id }]);
    res.status(201).json({ subscription: serializeSubscription(sub, user.homeCurrency, await getRates()), rewards });
  }),
);

subscriptionsRouter.get(
  '/:id',
  route(async (req, res) => {
    const user = await getUserOrThrow(userId(req));
    const sub = await ownedSubscription(user.id, param(req, 'id'));
    const charges = sub.merchantKey
      ? await prisma.transaction.findMany({
          where: { merchantKey: sub.merchantKey, card: { userId: user.id } },
          include: { card: { select: { nickname: true, currency: true } } },
          orderBy: { date: 'desc' },
        })
      : [];
    const catalog = sub.merchant ? CATALOG_BY_SLUG.get(sub.merchant.slug) : undefined;
    const totalPaid = charges.reduce((sum, c) => sum + num(c.amountLocal), 0);

    res.json({
      subscription: serializeSubscription(sub, user.homeCurrency, await getRates()),
      charges: charges.map((c) => ({
        id: c.id,
        date: isoDay(c.date),
        amountLocal: num(c.amountLocal),
        currency: c.card.currency,
        amountOriginal: num(c.amountOriginal) ?? null,
        originalCurrency: c.originalCurrency,
        card: c.card.nickname,
      })),
      totalPaid: Math.round(totalPaid * 100) / 100,
      cancelGuide: {
        manageUrl: sub.merchant?.manageUrl ?? catalog?.manageUrl ?? null,
        steps: cancelSteps(sub.name, sub.merchant?.manageUrl ?? null),
      },
    });
  }),
);

function cancelSteps(name: string, manageUrl: string | null): string[] {
  if (manageUrl?.includes('apps.apple.com')) {
    return ['On your iPhone, open Settings and tap your name.', 'Tap Subscriptions.', `Choose ${name} and tap Cancel Subscription.`];
  }
  if (manageUrl?.includes('play.google.com')) {
    return ['Open the Google Play Store.', 'Tap your profile picture, then Payments & subscriptions, then Subscriptions.', `Choose ${name} and tap Cancel.`];
  }
  return [
    manageUrl ? `Open the ${name} billing page with the button below and sign in.` : `Sign in to your ${name} account.`,
    'Go to the subscription, plan or billing section.',
    'Choose Cancel and confirm until you see that it is cancelled.',
    'Remove your saved card there too, so it cannot be charged again.',
  ];
}

const updateSchema = createSchema.omit({ merchantSlug: true }).partial();

subscriptionsRouter.patch(
  '/:id',
  route(async (req, res) => {
    const user = await getUserOrThrow(userId(req));
    await ownedSubscription(user.id, param(req, 'id'));
    const body = updateSchema.parse(req.body);
    await assertCard(user.id, body.cardId);

    const sub = await prisma.subscription.update({
      where: { id: param(req, 'id') },
      data: {
        ...body,
        nextRenewal: body.trialEndsAt ? dayToDate(body.trialEndsAt) : body.nextRenewal ? dayToDate(body.nextRenewal) : undefined,
        trialEndsAt: body.trialEndsAt === undefined ? undefined : body.trialEndsAt ? dayToDate(body.trialEndsAt) : null,
      },
      include,
    });
    res.json({ subscription: serializeSubscription(sub, user.homeCurrency, await getRates()) });
  }),
);

subscriptionsRouter.post(
  '/:id/status',
  route(async (req, res) => {
    const user = await getUserOrThrow(userId(req));
    const current = await ownedSubscription(user.id, param(req, 'id'));
    const { status } = z.object({ status: z.enum(['ACTIVE', 'CANCELLED']) }).parse(req.body);

    if (status === 'ACTIVE' && current.status === 'CANCELLED' && current.source === 'MANUAL') {
      await assertWithinPlan(user, 'manualSubscriptions');
    }
    const sub = await prisma.subscription.update({
      where: { id: current.id },
      data: status === 'CANCELLED' ? { status, cancelledAt: current.cancelledAt ?? new Date() } : { status, cancelledAt: null, verifiedAt: null },
      include,
    });
    const rewards = status === 'CANCELLED' ? await reward(user.id, [{ type: 'CANCEL_SUBSCRIPTION', refId: sub.id }]) : null;
    res.json({ subscription: serializeSubscription(sub, user.homeCurrency, await getRates()), rewards });
  }),
);

subscriptionsRouter.delete(
  '/:id',
  route(async (req, res) => {
    await ownedSubscription(userId(req), param(req, 'id'));
    await prisma.subscription.delete({ where: { id: param(req, 'id') } });
    res.status(204).end();
  }),
);
