import 'dotenv/config';
import { z } from 'zod';

const flag = z
  .enum(['true', 'false'])
  .default('false')
  .transform((v) => v === 'true');

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.url(),

    /** Signs access tokens. Must be a long random string in production. */
    JWT_SECRET: z.string().min(32).default('dev-only-secret-change-me-dev-only-secret'),

    /** Sign-in emails go through Resend when set; otherwise codes are logged (dev only). */
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().default('CardSweep <login@example.com>'),

    /** Enables the AI reader for statement formats without a dedicated parser. */
    ANTHROPIC_API_KEY: z.string().optional(),
    ANTHROPIC_MODEL: z.string().default('claude-opus-5-5'),

    /** RevenueCat sends this value in the Authorization header of its webhooks. */
    REVENUECAT_WEBHOOK_SECRET: z.string().optional(),
    /** Lets the app switch a test account to Pro without a purchase. Never enable in production. */
    ALLOW_DEV_UPGRADE: flag,

    FX_API_URL: z.url().default('https://open.er-api.com/v6/latest/USD'),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV !== 'production') return;
    if (value.JWT_SECRET.startsWith('dev-only')) {
      ctx.addIssue({ code: 'custom', path: ['JWT_SECRET'], message: 'Set a real secret in production' });
    }
    if (!value.RESEND_API_KEY) {
      ctx.addIssue({ code: 'custom', path: ['RESEND_API_KEY'], message: 'Required in production to send sign-in codes' });
    }
    if (value.ALLOW_DEV_UPGRADE) {
      ctx.addIssue({ code: 'custom', path: ['ALLOW_DEV_UPGRADE'], message: 'Must be false in production' });
    }
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
export const isDev = env.NODE_ENV === 'development';
