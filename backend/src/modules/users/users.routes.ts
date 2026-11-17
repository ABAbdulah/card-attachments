import { Router } from 'express';
import { z } from 'zod';
import { route, userId } from '../../lib/http.js';
import { prisma } from '../../lib/prisma.js';
import { SUPPORTED_CURRENCIES } from '../fx/fx.service.js';
import { exportUserData, FREE_LIMITS, getUserOrThrow, serializeUser, usage } from './users.service.js';

export const usersRouter = Router();

usersRouter.get(
  '/',
  route(async (req, res) => {
    const user = await getUserOrThrow(userId(req));
    res.json({ user: serializeUser(user), usage: await usage(user.id), limits: user.plan === 'PRO' ? null : FREE_LIMITS });
  }),
);

const updateSchema = z.object({
  displayName: z.string().trim().max(60).nullable().optional(),
  homeCurrency: z.enum(SUPPORTED_CURRENCIES as [string, ...string[]]).optional(),
  savingsGoalMonthly: z.number().positive().max(1e9).nullable().optional(),
  onboarded: z.boolean().optional(),
});

usersRouter.patch(
  '/',
  route(async (req, res) => {
    const data = updateSchema.parse(req.body);
    await getUserOrThrow(userId(req));
    const user = await prisma.user.update({ where: { id: userId(req) }, data });
    res.json({ user: serializeUser(user) });
  }),
);

usersRouter.get(
  '/export',
  route(async (req, res) => {
    const data = await exportUserData(userId(req));
    res.setHeader('Content-Disposition', 'attachment; filename="cardsweep-export.json"');
    res.json(data);
  }),
);

/** Permanently deletes the account and everything linked to it (cascading foreign keys). */
usersRouter.delete(
  '/',
  route(async (req, res) => {
    await prisma.user.deleteMany({ where: { id: userId(req) } });
    res.status(204).end();
  }),
);

const deviceSchema = z.object({ pushToken: z.string().min(10), platform: z.enum(['IOS', 'ANDROID']) });

usersRouter.post(
  '/devices',
  route(async (req, res) => {
    const { pushToken, platform } = deviceSchema.parse(req.body);
    await prisma.device.upsert({
      where: { pushToken },
      create: { pushToken, platform, userId: userId(req) },
      update: { userId: userId(req), platform },
    });
    res.status(204).end();
  }),
);
