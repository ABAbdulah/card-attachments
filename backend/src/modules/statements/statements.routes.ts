import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { param, route, userId } from '../../lib/http.js';
import { dayToDate, isoDay } from '../../lib/money.js';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../middleware/error.js';
import { reward, type XpType } from '../gamification/gamification.service.js';
import { getRates } from '../fx/fx.service.js';
import { CATALOG_BY_SLUG } from '../merchants/catalog.js';
import { serializeSubscription } from '../subscriptions/subscriptions.service.js';
import { getUserOrThrow } from '../users/users.service.js';
import { importStatement, serializeCandidate } from './statements.service.js';

/** Statements are held in memory only, never written to disk. */
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } });

export const statementsRouter = Router();

statementsRouter.post(
  '/',
  upload.single('file'),
  route(async (req, res) => {
    const user = await getUserOrThrow(userId(req));
    if (!req.file) throw new HttpError(400, 'Attach a statement file.', 'VALIDATION');
    const { password, cardId } = z
      .object({ password: z.string().max(100).optional(), cardId: z.string().uuid().optional() })
      .parse(req.body ?? {});

    const result = await importStatement({
      user,
      buffer: req.file.buffer,
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      password,
      cardId,
    });
    req.file.buffer.fill(0);
    res.status(201).json(result);
  }),
);

statementsRouter.get(
  '/',
  route(async (req, res) => {
    const statements = await prisma.statement.findMany({
      where: { card: { userId: userId(req) } },
      include: { card: { select: { nickname: true } } },
      orderBy: { importedAt: 'desc' },
    });
    res.json({
      statements: statements.map((s) => ({
        id: s.id,
        bank: s.bank,
        card: s.card.nickname,
        periodStart: isoDay(s.periodStart),
        periodEnd: isoDay(s.periodEnd),
        charges: s.chargeCount,
        duplicates: s.duplicateCount,
        importedAt: s.importedAt.toISOString(),
      })),
    });
  }),
);

statementsRouter.delete(
  '/:id',
  route(async (req, res) => {
    const deleted = await prisma.statement.deleteMany({ where: { id: param(req, 'id'), card: { userId: userId(req) } } });
    if (!deleted.count) throw new HttpError(404, 'Statement not found.', 'NOT_FOUND');
    res.status(204).end();
  }),
);

export const candidatesRouter = Router();

candidatesRouter.get(
  '/',
  route(async (req, res) => {
    const candidates = await prisma.candidate.findMany({
      where: { userId: userId(req), decision: 'PENDING' },
      include: { statement: { select: { card: { select: { currency: true } } } } },
      orderBy: [{ confidence: 'asc' }, { lastAmountLocal: 'desc' }],
    });
    res.json({ candidates: candidates.map((c) => serializeCandidate(c, c.statement.card.currency)) });
  }),
);

const reviewSchema = z.object({
  decisions: z
    .array(
      z.object({
        id: z.string().uuid(),
        accept: z.boolean(),
        cadence: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']).optional(),
        name: z.string().trim().min(1).max(60).optional(),
      }),
    )
    .min(1),
});

/** Confirms or rejects suggestions. Confirmed ones become tracked subscriptions. */
candidatesRouter.post(
  '/review',
  route(async (req, res) => {
    const user = await getUserOrThrow(userId(req));
    const { decisions } = reviewSchema.parse(req.body);
    const candidates = await prisma.candidate.findMany({
      where: { id: { in: decisions.map((d) => d.id) }, userId: user.id, decision: 'PENDING' },
      include: { statement: { include: { card: true } } },
    });
    const byId = new Map(candidates.map((c) => [c.id, c]));
    const events: { type: XpType; refId: string }[] = [];
    const created: string[] = [];

    for (const decision of decisions) {
      const c = byId.get(decision.id);
      if (!c) continue;
      if (!decision.accept) {
        await prisma.candidate.update({ where: { id: c.id }, data: { decision: 'REJECTED' } });
        continue;
      }
      const card = c.statement.card;
      const sub = await prisma.subscription.create({
        data: {
          userId: user.id,
          merchantId: c.merchantId,
          merchantKey: c.merchantKey,
          name: decision.name ?? c.merchantName,
          category: CATALOG_BY_SLUG.get(c.merchantKey)?.category,
          cadence: decision.cadence ?? c.cadence ?? 'MONTHLY',
          priceOriginal: c.priceOriginal ?? c.lastAmountLocal,
          currency: c.originalCurrency ?? card.currency,
          lastChargedLocal: c.lastAmountLocal,
          lastChargedAt: c.lastCharge,
          nextRenewal: dayToDate(isoDay(c.lastCharge)),
          cardId: card.id,
          source: 'DETECTED',
          confidence: c.confidence,
        },
      });
      await prisma.candidate.update({ where: { id: c.id }, data: { decision: 'ACCEPTED', subscriptionId: sub.id } });
      events.push({ type: 'CONFIRM_SUBSCRIPTION', refId: c.id });
      created.push(sub.id);
    }

    // Reviewing everything a statement suggested earns the clean-sweep XP.
    const statementIds = [...new Set(candidates.map((c) => c.statementId))];
    for (const statementId of statementIds) {
      const pending = await prisma.candidate.count({ where: { statementId, decision: 'PENDING' } });
      if (pending === 0) events.push({ type: 'REVIEW_COMPLETE', refId: statementId });
    }

    const [rewards, subs, rates] = await Promise.all([
      reward(user.id, events),
      prisma.subscription.findMany({ where: { id: { in: created } }, include: { merchant: true, card: true } }),
      getRates(),
    ]);
    res.json({ subscriptions: subs.map((s) => serializeSubscription(s, user.homeCurrency, rates)), rewards });
  }),
);
