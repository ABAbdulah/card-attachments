import type { User } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../middleware/error.js';

export const FREE_LIMITS = { statements: 1, manualSubscriptions: 5 } as const;

export function serializeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    homeCurrency: user.homeCurrency,
    plan: user.plan,
    savingsGoalMonthly: user.savingsGoalMonthly ? user.savingsGoalMonthly.toNumber() : null,
    onboarded: user.onboarded,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function getUserOrThrow(userId: string): Promise<User> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(401, 'This account no longer exists.', 'UNAUTHENTICATED');
  return user;
}

export async function usage(userId: string) {
  const [statements, manualSubscriptions] = await Promise.all([
    prisma.statement.count({ where: { card: { userId } } }),
    prisma.subscription.count({ where: { userId, source: 'MANUAL', status: 'ACTIVE' } }),
  ]);
  return { statements, manualSubscriptions };
}

export async function assertWithinPlan(user: User, kind: keyof typeof FREE_LIMITS) {
  if (user.plan === 'PRO') return;
  const used = (await usage(user.id))[kind];
  if (used >= FREE_LIMITS[kind]) {
    const message =
      kind === 'statements'
        ? 'The free plan includes one statement scan. Upgrade to Pro for unlimited scans.'
        : `The free plan tracks up to ${FREE_LIMITS.manualSubscriptions} subscriptions you add yourself. Upgrade to Pro for unlimited.`;
    throw new HttpError(402, message, 'PLAN_LIMIT');
  }
}

/** Everything stored about the user, for the "export my data" button. */
export async function exportUserData(userId: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      cards: { include: { statements: true, transactions: true } },
      subscriptions: true,
      candidates: true,
      xpEvents: true,
      badges: true,
      alerts: true,
      devices: { select: { platform: true, createdAt: true } },
    },
  });
}
