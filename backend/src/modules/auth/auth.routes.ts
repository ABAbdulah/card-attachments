import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { env, isDev } from '../../config/env.js';
import { route } from '../../lib/http.js';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../middleware/error.js';
import { serializeUser } from '../users/users.service.js';
import { sendLoginCode } from './email.js';
import { generateOtp, hashesMatch, issueSession, revokeRefreshToken, rotateRefreshToken, sha256 } from './tokens.js';

const OTP_TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;

export const authRouter = Router();

const codeLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: env.NODE_ENV === 'test' ? 1000 : 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many codes requested. Try again in 15 minutes.', code: 'RATE_LIMITED' },
});

const emailSchema = z.object({ email: z.email().transform((e) => e.trim().toLowerCase()) });

authRouter.post(
  '/otp/request',
  codeLimiter,
  route(async (req, res) => {
    const { email } = emailSchema.parse(req.body);
    const code = generateOtp();

    await prisma.otpCode.create({
      data: { email, codeHash: sha256(code), expiresAt: new Date(Date.now() + OTP_TTL_MS) },
    });
    await sendLoginCode(email, code);

    // Development only: return the code so the app can be tested without an inbox.
    res.json({ sent: true, ...(isDev && !env.RESEND_API_KEY ? { devCode: code } : {}) });
  }),
);

authRouter.post(
  '/otp/verify',
  route(async (req, res) => {
    const { email, code } = emailSchema.extend({ code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code') }).parse(req.body);

    const otp = await prisma.otpCode.findFirst({
      where: { email, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp || otp.attempts >= MAX_ATTEMPTS) {
      throw new HttpError(400, 'This code has expired. Request a new one.', 'CODE_EXPIRED');
    }
    if (!hashesMatch(otp.codeHash, sha256(code))) {
      await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      throw new HttpError(400, 'That code is not right. Check the email and try again.', 'CODE_INVALID');
    }

    await prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, authProvider: 'EMAIL' },
    });

    res.json({ ...(await issueSession(user.id)), user: serializeUser(user) });
  }),
);

const refreshSchema = z.object({ refreshToken: z.string().min(20) });

authRouter.post(
  '/refresh',
  route(async (req, res) => {
    const { refreshToken } = refreshSchema.parse(req.body);
    const session = await rotateRefreshToken(refreshToken);
    if (!session) throw new HttpError(401, 'Your session has ended. Sign in again.', 'SESSION_EXPIRED');
    res.json({ accessToken: session.accessToken, refreshToken: session.refreshToken });
  }),
);

authRouter.post(
  '/logout',
  route(async (req, res) => {
    const { refreshToken } = refreshSchema.parse(req.body);
    await revokeRefreshToken(refreshToken);
    res.status(204).end();
  }),
);
