import type { ErrorRequestHandler, RequestHandler } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { logger } from '../lib/logger.js';

/**
 * An error the client is meant to see. `code` is a stable machine-readable
 * value the app branches on (for example PLAN_LIMIT opens the paywall).
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
  }
}

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, code: err.code });
    return;
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    const field = first?.path.join('.');
    res.status(400).json({
      error: field ? `${field}: ${first?.message}` : (first?.message ?? 'Invalid request'),
      code: 'VALIDATION',
    });
    return;
  }
  if (err instanceof multer.MulterError) {
    const tooBig = err.code === 'LIMIT_FILE_SIZE';
    res.status(tooBig ? 413 : 400).json({
      error: tooBig ? 'The file is larger than 10 MB.' : err.message,
      code: tooBig ? 'FILE_TOO_LARGE' : 'UPLOAD',
    });
    return;
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Malformed JSON body', code: 'VALIDATION' });
    return;
  }
  logger.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.', code: 'INTERNAL' });
};
