import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { issueSession } from '../src/modules/auth/tokens.js';
import { seedMerchants } from '../src/modules/merchants/seed.js';

export const app = createApp();

const TABLES = [
  'alerts',
  'user_badges',
  'xp_events',
  'candidates',
  'transactions',
  'statements',
  'subscriptions',
  'cards',
  'devices',
  'refresh_tokens',
  'otp_codes',
  'users',
  'fx_rates',
];

export async function resetDb() {
  await prisma.$executeRawUnsafe(`TRUNCATE ${TABLES.map((t) => `"${t}"`).join(', ')} CASCADE`);
  await seedMerchants();
  // Fixed rates so cost assertions are deterministic.
  const fetchedAt = new Date();
  await prisma.fxRate.createMany({
    data: [
      { currency: 'USD', perUsd: 1, fetchedAt },
      { currency: 'PKR', perUsd: 300, fetchedAt },
    ],
  });
  const { resetRatesCache } = await import('../src/modules/fx/fx.service.js');
  resetRatesCache();
}

export async function createUser(email = 'tester@example.com', plan: 'FREE' | 'PRO' = 'FREE') {
  const user = await prisma.user.create({ data: { email, authProvider: 'EMAIL', plan, homeCurrency: 'PKR' } });
  const { accessToken } = await issueSession(user.id);
  return { user, auth: { Authorization: `Bearer ${accessToken}` } };
}

export const api = () => request(app);

/** Builds a CSV statement with one row per [date, description, amount]. Negative amounts are debits. */
export function csv(rows: [string, string, number][]): Buffer {
  const lines = ['Date,Description,Amount (PKR)', ...rows.map(([d, desc, amount]) => `${d},"${desc}",${amount}`)];
  return Buffer.from(lines.join('\n'));
}
