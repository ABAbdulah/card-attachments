import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { logger } from './lib/logger.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/error.js';
import { alertsRouter } from './modules/alerts/alerts.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { billingRouter } from './modules/billing/billing.routes.js';
import { cardsRouter } from './modules/cards/cards.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { progressRouter } from './modules/gamification/progress.routes.js';
import { healthRouter } from './modules/health/health.routes.js';
import { merchantsRouter } from './modules/merchants/merchants.routes.js';
import { candidatesRouter, statementsRouter } from './modules/statements/statements.routes.js';
import { subscriptionsRouter } from './modules/subscriptions/subscriptions.routes.js';
import { usersRouter } from './modules/users/users.routes.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(
    pinoHttp({
      logger,
      // Log only the request line: headers and bodies can carry personal data.
      serializers: {
        req: (req) => ({ method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
  );

  app.use('/health', healthRouter);
  app.use('/auth', authRouter);
  app.use('/billing', billingRouter);

  app.use('/me', requireAuth, usersRouter);
  app.use('/dashboard', requireAuth, dashboardRouter);
  app.use('/subscriptions', requireAuth, subscriptionsRouter);
  app.use('/merchants', requireAuth, merchantsRouter);
  app.use('/cards', requireAuth, cardsRouter);
  app.use('/statements', requireAuth, statementsRouter);
  app.use('/candidates', requireAuth, candidatesRouter);
  app.use('/alerts', requireAuth, alertsRouter);
  app.use('/progress', requireAuth, progressRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
