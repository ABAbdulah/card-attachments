import { round2 } from '../../lib/money.js';
import { prisma } from '../../lib/prisma.js';
import { convert, getRates } from '../fx/fx.service.js';
import { costInHome } from '../subscriptions/pricing.js';

/** XP is earned once per (type, ref): toggling a subscription back and forth does not farm XP. */
export const XP_RULES = {
  UPLOAD_STATEMENT: 30,
  CONFIRM_SUBSCRIPTION: 20,
  REVIEW_COMPLETE: 25,
  CANCEL_SUBSCRIPTION: 50,
  ADD_MANUAL: 10,
  VERIFIED_CANCEL: 100,
} as const;
export type XpType = keyof typeof XP_RULES;

const XP_LABELS: Record<XpType, string> = {
  UPLOAD_STATEMENT: 'Scanned a statement',
  CONFIRM_SUBSCRIPTION: 'Confirmed a subscription',
  REVIEW_COMPLETE: 'Reviewed every suggestion',
  CANCEL_SUBSCRIPTION: 'Cancelled a subscription',
  ADD_MANUAL: 'Added a subscription',
  VERIFIED_CANCEL: 'Cancellation verified',
};

/** XP needed to reach each level: index 0 is level 1. */
const LEVEL_XP = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000];
const LEVEL_TITLES = [
  'Newcomer',
  'Tracker',
  'Spotter',
  'Trimmer',
  'Saver',
  'Sharp saver',
  'Strategist',
  'Optimiser',
  'Expert',
  'Master',
  'Legend',
];

export function levelFor(xp: number) {
  let index = 0;
  while (index + 1 < LEVEL_XP.length && xp >= LEVEL_XP[index + 1]!) index++;
  const next = LEVEL_XP[index + 1];
  return {
    level: index + 1,
    title: LEVEL_TITLES[index]!,
    levelStartXp: LEVEL_XP[index]!,
    nextLevelXp: next ?? null,
  };
}

/** Saving thresholds are defined in USD so they mean the same thing in every currency. */
const SAVER_TIERS_USD = [
  { id: 'saver-1', name: 'Saver', usd: 10 },
  { id: 'saver-2', name: 'Super saver', usd: 50 },
  { id: 'saver-3', name: 'Money master', usd: 150 },
];

type Stats = {
  statements: number;
  cancelled: number;
  reviewsComplete: number;
  verified: number;
  tracked: number;
  savedMonthlyUsd: number;
  streak: number;
};

type BadgeDef = {
  id: string;
  name: string;
  description: (fmt: (usd: number) => string) => string;
  earned: (s: Stats) => boolean;
};

const BADGES: BadgeDef[] = [
  { id: 'first-scan', name: 'First scan', description: () => 'Scan your first bank statement.', earned: (s) => s.statements >= 1 },
  { id: 'organised', name: 'Organised', description: () => 'Track 5 subscriptions.', earned: (s) => s.tracked >= 5 },
  { id: 'clean-sweep', name: 'Clean sweep', description: () => 'Review every suggestion from a statement.', earned: (s) => s.reviewsComplete >= 1 },
  { id: 'first-cut', name: 'First cut', description: () => 'Cancel your first subscription.', earned: (s) => s.cancelled >= 1 },
  ...SAVER_TIERS_USD.map(
    (tier): BadgeDef => ({
      id: tier.id,
      name: tier.name,
      description: (fmt) => `Save ${fmt(tier.usd)} a month by cancelling subscriptions.`,
      earned: (s) => s.savedMonthlyUsd >= tier.usd,
    }),
  ),
  { id: 'streak-3', name: '3-month streak', description: () => 'Scan or review in 3 months in a row.', earned: (s) => s.streak >= 3 },
  { id: 'streak-6', name: '6-month streak', description: () => 'Scan or review in 6 months in a row.', earned: (s) => s.streak >= 6 },
  { id: 'streak-12', name: 'Year streak', description: () => 'Scan or review in 12 months in a row.', earned: (s) => s.streak >= 12 },
  { id: 'verified', name: 'Verified', description: () => 'A later statement proves a cancellation worked.', earned: (s) => s.verified >= 1 },
];

export type Rewards = {
  xpGained: number;
  totalXp: number;
  level: number;
  leveledUp: boolean;
  newBadges: { id: string; name: string }[];
};

/** Records XP events (ignoring repeats), evaluates badges, and reports what changed for the celebration UI. */
export async function reward(userId: string, events: { type: XpType; refId: string }[]): Promise<Rewards> {
  const before = await totalXp(userId);

  if (events.length) {
    await prisma.xpEvent.createMany({
      data: events.map((e) => ({ userId, type: e.type, refId: e.refId, xp: XP_RULES[e.type] })),
      skipDuplicates: true,
    });
  }
  const after = await totalXp(userId);
  const newBadges = await evaluateBadges(userId);

  return {
    xpGained: after - before,
    totalXp: after,
    level: levelFor(after).level,
    leveledUp: levelFor(after).level > levelFor(before).level,
    newBadges,
  };
}

async function totalXp(userId: string): Promise<number> {
  const sum = await prisma.xpEvent.aggregate({ where: { userId }, _sum: { xp: true } });
  return sum._sum.xp ?? 0;
}

async function evaluateBadges(userId: string) {
  const stats = await collectStats(userId);
  const owned = new Set((await prisma.userBadge.findMany({ where: { userId } })).map((b) => b.badgeId));
  const fresh = BADGES.filter((b) => !owned.has(b.id) && b.earned(stats));
  if (fresh.length) {
    await prisma.userBadge.createMany({ data: fresh.map((b) => ({ userId, badgeId: b.id })), skipDuplicates: true });
  }
  return fresh.map((b) => ({ id: b.id, name: b.name }));
}

async function collectStats(userId: string): Promise<Stats> {
  const [user, statements, subs, events, rates] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.statement.count({ where: { card: { userId } } }),
    prisma.subscription.findMany({ where: { userId }, include: { card: true } }),
    prisma.xpEvent.findMany({ where: { userId }, select: { type: true, createdAt: true } }),
    getRates(),
  ]);
  const cancelled = subs.filter((s) => s.status === 'CANCELLED');
  const savedMonthlyHome = cancelled.reduce((sum, s) => sum + costInHome(s, user.homeCurrency, rates).monthly, 0);

  return {
    statements,
    cancelled: cancelled.length,
    reviewsComplete: events.filter((e) => e.type === 'REVIEW_COMPLETE').length,
    verified: subs.filter((s) => s.verifiedAt).length,
    tracked: subs.length,
    savedMonthlyUsd: convert(savedMonthlyHome, user.homeCurrency, 'USD', rates),
    streak: streakMonths(events).months,
  };
}

/** Consecutive calendar months with a scan or a full review, ending this month or last month. */
export function streakMonths(events: { type: string; createdAt: Date }[], now = new Date()) {
  const active = new Set(
    events
      .filter((e) => e.type === 'UPLOAD_STATEMENT' || e.type === 'REVIEW_COMPLETE')
      .map((e) => e.createdAt.toISOString().slice(0, 7)),
  );
  const monthKey = (offset: number) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    return d.toISOString().slice(0, 7);
  };

  const activeThisMonth = active.has(monthKey(0));
  let offset = activeThisMonth ? 0 : 1;
  let months = 0;
  while (active.has(monthKey(offset))) {
    months++;
    offset++;
  }
  return { months, activeThisMonth };
}

export async function getProgress(userId: string) {
  const [user, events, owned, subs, rates] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.xpEvent.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.userBadge.findMany({ where: { userId } }),
    prisma.subscription.findMany({ where: { userId }, include: { card: true } }),
    getRates(),
  ]);
  const home = user.homeCurrency;
  const xp = events.reduce((sum, e) => sum + e.xp, 0);
  const fmtUsd = (usd: number) => `${home} ${Math.round(convert(usd, 'USD', home, rates)).toLocaleString('en-US')}`;

  const now = Date.now();
  let savedMonthly = 0;
  let savedLifetime = 0;
  let activeMonthly = 0;
  for (const sub of subs) {
    const monthly = costInHome(sub, home, rates).monthly;
    if (sub.status === 'CANCELLED') {
      savedMonthly += monthly;
      const months = sub.cancelledAt ? (now - sub.cancelledAt.getTime()) / (30.44 * 86_400_000) : 0;
      savedLifetime += monthly * Math.max(months, 0);
    } else {
      activeMonthly += monthly;
    }
  }
  const ownedById = new Map(owned.map((b) => [b.badgeId, b.earnedAt]));

  return {
    xp,
    ...levelFor(xp),
    streak: streakMonths(events),
    savings: {
      currency: home,
      monthly: round2(savedMonthly),
      lifetime: round2(savedLifetime),
      activeMonthly: round2(activeMonthly),
      goalMonthly: user.savingsGoalMonthly ? user.savingsGoalMonthly.toNumber() : null,
    },
    badges: BADGES.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description(fmtUsd),
      earned: ownedById.has(b.id),
      earnedAt: ownedById.get(b.id)?.toISOString() ?? null,
    })),
    recent: events.slice(0, 10).map((e) => ({
      id: e.id,
      label: XP_LABELS[e.type as XpType] ?? e.type,
      xp: e.xp,
      at: e.createdAt.toISOString(),
    })),
  };
}
