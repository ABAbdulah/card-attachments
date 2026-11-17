import type { RequestHandler } from 'express';
import { verifyAccessToken } from '../modules/auth/tokens.js';
import { HttpError } from './error.js';

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  const userId = token ? await verifyAccessToken(token) : undefined;
  if (!userId) {
    next(new HttpError(401, 'Sign in to continue.', 'UNAUTHENTICATED'));
    return;
  }
  req.userId = userId;
  next();
};
