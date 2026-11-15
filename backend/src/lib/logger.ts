import { pino } from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : 'info',
  // Financial data must never reach the logs.
  redact: ['req.headers.authorization', 'req.headers.cookie'],
});
