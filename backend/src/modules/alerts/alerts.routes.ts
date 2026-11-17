import { Router } from 'express';
import { param, route, userId } from '../../lib/http.js';
import { prisma } from '../../lib/prisma.js';

export const alertsRouter = Router();

alertsRouter.get(
  '/',
  route(async (req, res) => {
    const alerts = await prisma.alert.findMany({ where: { userId: userId(req) }, orderBy: { createdAt: 'desc' }, take: 50 });
    res.json({
      alerts: alerts.map((a) => ({
        id: a.id,
        type: a.type,
        title: a.title,
        body: a.body,
        subscriptionId: a.subscriptionId,
        createdAt: a.createdAt.toISOString(),
        read: a.readAt !== null,
      })),
    });
  }),
);

alertsRouter.post(
  '/read-all',
  route(async (req, res) => {
    await prisma.alert.updateMany({ where: { userId: userId(req), readAt: null }, data: { readAt: new Date() } });
    res.status(204).end();
  }),
);

alertsRouter.post(
  '/:id/read',
  route(async (req, res) => {
    await prisma.alert.updateMany({ where: { id: param(req, 'id'), userId: userId(req) }, data: { readAt: new Date() } });
    res.status(204).end();
  }),
);
