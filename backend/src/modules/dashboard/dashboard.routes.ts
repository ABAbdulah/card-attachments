import { Router } from 'express';
import { route, userId } from '../../lib/http.js';
import { round2, todayIso } from '../../lib/money.js';
import { prisma } from '../../lib/prisma.js';
import { getRates } from '../fx/fx.service.js';
import { levelFor, streakMonths } from '../gamification/gamification.service.js';
import { renewalsBetween } from '../subscriptions/schedule.js';
import { anchorOf, serializeSubscription } from '../subscriptions/subscriptions.service.js';
import { getUserOrThrow } from '../users/users.service.js';

export const dashboardRouter = Router();

/** Everything the Home screen shows, in one request. */
dashboardRouter.get(
  '/',
  route(async (req, res) => {
    const user = await getUserOrThrow(userId(req));
    const [subs, rates, unreadAlerts, pendingCandidates, events, statements] = await Promise.all([
      prisma.subscription.findMany({ where: { userId: user.id }, include: { merchant: true, card: true } }),
      getRates(),
      prisma.alert.count({ where: { userId: user.id, readAt: null } }),
      prisma.candidate.count({ where: { userId: user.id, decision: 'PENDING' } }),
      prisma.xpEvent.findMany({ where: { userId: user.id }, select: { type: true, xp: true, createdAt: true } }),
      prisma.statement.count({ where: { card: { userId: user.id } } }),
    ]);

    const today = todayIso();
    const monthStart = `${today.slice(0, 7)}-01`;
    const monthEnd = new Date(Date.UTC(+today.slice(0, 4), +today.slice(5, 7), 0)).toISOString().slice(0, 10);
    const in30 = new Date(Date.parse(today) + 30 * 86_400_000).toISOString().slice(0, 10);

    let dueThisMonth = 0;
    let paidThisMonth = 0;
    let monthly = 0;
    let savedMonthly = 0;
    const categories = new Map<string, number>();
    const upcoming: { id: string; name: string; brandColor: string | null; date: string; amount: number; trial: boolean }[] = [];
    const trialsEnding: { id: string; name: string; brandColor: string | null; date: string; amount: number }[] = [];
    const in14 = new Date(Date.parse(today) + 14 * 86_400_000).toISOString().slice(0, 10);

    for (const sub of subs) {
      const s = serializeSubscription(sub, user.homeCurrency, rates, today);
      if (sub.status === 'CANCELLED') {
        savedMonthly += s.cost.monthly;
        continue;
      }
      monthly += s.cost.monthly;
      const category = s.category ?? 'Other';
      categories.set(category, (categories.get(category) ?? 0) + s.cost.monthly);

      const anchor = anchorOf(sub);
      if (!anchor) continue;
      // Nothing is charged before a free trial ends.
      const firstCharge = s.trialEndsAt ?? '';
      for (const date of renewalsBetween(anchor, sub.cadence, monthStart, monthEnd).filter((d) => d >= firstCharge)) {
        dueThisMonth += s.cost.perCharge;
        if (date < today) paidThisMonth += s.cost.perCharge;
      }
      if (s.nextRenewal && s.nextRenewal <= in30) {
        upcoming.push({ id: s.id, name: s.name, brandColor: s.brandColor, date: s.nextRenewal, amount: s.cost.perCharge, trial: s.trialEndsAt === s.nextRenewal });
      }
      if (s.trialEndsAt && s.trialEndsAt <= in14) {
        trialsEnding.push({ id: s.id, name: s.name, brandColor: s.brandColor, date: s.trialEndsAt, amount: s.cost.perCharge });
      }
    }
    upcoming.sort((a, b) => a.date.localeCompare(b.date));
    trialsEnding.sort((a, b) => a.date.localeCompare(b.date));
    const xp = events.reduce((sum, e) => sum + e.xp, 0);

    res.json({
      currency: user.homeCurrency,
      dueThisMonth: round2(dueThisMonth),
      paidThisMonth: round2(paidThisMonth),
      remainingThisMonth: round2(dueThisMonth - paidThisMonth),
      monthlyAverage: round2(monthly),
      yearlyTotal: round2(monthly * 12),
      savedMonthly: round2(savedMonthly),
      activeCount: subs.filter((s) => s.status === 'ACTIVE').length,
      cancelledCount: subs.filter((s) => s.status === 'CANCELLED').length,
      upcoming: upcoming.slice(0, 6),
      trialsEnding,
      hasSavingsGoal: user.savingsGoalMonthly !== null,
      categories: [...categories.entries()]
        .map(([name, value]) => ({ name, monthly: round2(value) }))
        .sort((a, b) => b.monthly - a.monthly),
      unreadAlerts,
      pendingCandidates,
      statements,
      progress: { xp, ...levelFor(xp), streak: streakMonths(events) },
    });
  }),
);
