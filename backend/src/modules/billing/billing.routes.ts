import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { route, userId } from '../../lib/http.js';
import { logger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import { HttpError } from '../../middleware/error.js';
import { serializeUser } from '../users/users.service.js';

export const billingRouter = Router();

/** RevenueCat events that grant or remove Pro. The app sets RevenueCat's app_user_id to our user id. */
const GRANTS = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'NON_RENEWING_PURCHASE', 'PRODUCT_CHANGE']);
const REVOKES = new Set(['EXPIRATION']);

billingRouter.post(
  '/revenuecat',
  route(async (req, res) => {
    if (!env.REVENUECAT_WEBHOOK_SECRET || req.headers.authorization !== env.REVENUECAT_WEBHOOK_SECRET) {
      throw new HttpError(401, 'Unauthorized', 'UNAUTHENTICATED');
    }
    const { event } = z
      .object({ event: z.object({ type: z.string(), app_user_id: z.string() }).passthrough() })
      .parse(req.body);

    const plan = GRANTS.has(event.type) ? 'PRO' : REVOKES.has(event.type) ? 'FREE' : undefined;
    if (plan) {
      const result = await prisma.user.updateMany({ where: { id: event.app_user_id }, data: { plan } });
      logger.info({ type: event.type, matched: result.count }, 'RevenueCat event applied');
    }
    res.json({ ok: true });
  }),
);

/** Test accounts only: switch plan without a purchase. Disabled unless ALLOW_DEV_UPGRADE=true. */
billingRouter.post(
  '/dev-plan',
  requireAuth,
  route(async (req, res) => {
    if (!env.ALLOW_DEV_UPGRADE) throw new HttpError(403, 'Purchases are not available yet.', 'BILLING_UNAVAILABLE');
    const { plan } = z.object({ plan: z.enum(['FREE', 'PRO']) }).parse(req.body);
    const user = await prisma.user.update({ where: { id: userId(req) }, data: { plan } });
    res.json({ user: serializeUser(user) });
  }),
);

billingRouter.get('/config', (_req, res) => {
  res.json({ purchasesEnabled: false, devPlanSwitch: env.ALLOW_DEV_UPGRADE });
});
