import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Express 5 forwards rejected promises, but this keeps handler types tidy. */
export function route(handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}

/** The authenticated user id. Only call behind requireAuth. */
export function userId(req: Request): string {
  if (!req.userId) throw new Error('userId() used on an unauthenticated route');
  return req.userId;
}

export function param(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string' || !value) throw new Error(`Missing route param ${name}`);
  return value;
}
