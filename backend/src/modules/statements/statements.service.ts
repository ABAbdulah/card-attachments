import type { Card, Candidate, User } from '../../generated/prisma/client.js';
import { dayToDate, isoDay, num } from '../../lib/money.js';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../middleware/error.js';
import { CADENCE_DAYS, chargesFromParsed, detectSubscriptions, type Charge, type Detection } from '../detection/detect.js';
import { reward, type XpType } from '../gamification/gamification.service.js';
import { CATALOG_BY_SLUG } from '../merchants/catalog.js';
import { merchantIdsBySlug } from '../merchants/seed.js';
import { assertWithinPlan } from '../users/users.service.js';
import { parseStatementFile } from './parse.js';

type ImportInput = {
  user: User;
  buffer: Buffer;
  filename: string;
  mimetype: string;
  password?: string;
  cardId?: string;
};

export async function importStatement({ user, buffer, filename, mimetype, password, cardId }: ImportInput) {
  await assertWithinPlan(user, 'statements');
  const parsed = await parseStatementFile({ buffer, filename, mimetype, password, fallbackCurrency: user.homeCurrency });
  const card = await resolveCard(user, cardId, parsed.bank, parsed.currency);
  if (card.currency !== parsed.currency) {
    throw new HttpError(400, `This statement is in ${parsed.currency} but ${card.nickname} is a ${card.currency} card.`, 'CURRENCY_MISMATCH');
  }

  // Only card charges are stored: transfers carry other people's names and are not needed.
  const charges = chargesFromParsed(parsed.transactions);
  const merchantIds = await merchantIdsBySlug();

  const statement = await prisma.statement.create({
    data: {
      cardId: card.id,
      bank: parsed.bank,
      periodStart: dayToDate(parsed.periodStart),
      periodEnd: dayToDate(parsed.periodEnd),
      chargeCount: charges.length,
    },
  });
  const seen = new Map<string, number>();
  const inserted = await prisma.transaction.createMany({
    data: charges.map((c) => {
      const key = `${c.date}|${c.description}|${c.amountLocal}`;
      const occurrence = seen.get(key) ?? 0;
      seen.set(key, occurrence + 1);
      return {
      cardId: card.id,
      statementId: statement.id,
      merchantId: c.merchantSlug ? merchantIds.get(c.merchantSlug) : undefined,
      merchantKey: c.merchantKey,
      merchantName: c.merchantName,
      date: dayToDate(c.date),
      rawDescription: c.description,
      amountLocal: c.amountLocal,
        amountOriginal: c.amountOriginal,
        originalCurrency: c.originalCurrency,
        occurrence,
      };
    }),
    skipDuplicates: true,
  });
  const duplicates = charges.length - inserted.count;
  if (duplicates) await prisma.statement.update({ where: { id: statement.id }, data: { duplicateCount: duplicates } });

  // Detect across the card's whole history, so each new statement sharpens earlier guesses.
  const history = await cardCharges(card.id);
  const asOf = await coveredUntil(card.id);
  const detections = detectSubscriptions(history, asOf);

  const reconciled = await reconcile(user, card, history, asOf);
  const candidates = await createCandidates(user, statement.id, detections, merchantIds);

  const events: { type: XpType; refId: string }[] = [
    { type: 'UPLOAD_STATEMENT', refId: statement.id },
    ...reconciled.verified.map((id) => ({ type: 'VERIFIED_CANCEL' as const, refId: id })),
  ];
  const rewards = await reward(user.id, events);

  return {
    statement: {
      id: statement.id,
      bank: parsed.bank,
      card: { id: card.id, nickname: card.nickname },
      periodStart: parsed.periodStart,
      periodEnd: parsed.periodEnd,
      charges: charges.length,
      duplicates,
      merchants: new Set(charges.map((c) => c.merchantKey)).size,
    },
    candidates: candidates.map((c) => serializeCandidate(c, card.currency)),
    updatedSubscriptions: reconciled.updated,
    alerts: reconciled.alerts,
    rewards,
  };
}

async function resolveCard(user: User, cardId: string | undefined, bank: string, currency: string): Promise<Card> {
  if (cardId) {
    const card = await prisma.card.findFirst({ where: { id: cardId, userId: user.id } });
    if (!card) throw new HttpError(404, 'Card not found.', 'NOT_FOUND');
    return card;
  }
  const existing = await prisma.card.findFirst({ where: { userId: user.id, bank, currency } });
  return existing ?? prisma.card.create({ data: { userId: user.id, nickname: bank, bank, currency } });
}

async function cardCharges(cardId: string): Promise<Charge[]> {
  const rows = await prisma.transaction.findMany({ where: { cardId }, orderBy: { date: 'asc' } });
  return rows.map((t) => {
    const catalog = CATALOG_BY_SLUG.get(t.merchantKey);
    return {
      date: isoDay(t.date),
      description: t.rawDescription,
      amountLocal: num(t.amountLocal),
      amountOriginal: num(t.amountOriginal),
      originalCurrency: t.originalCurrency ?? undefined,
      merchantKey: t.merchantKey,
      merchantName: t.merchantName,
      merchantSlug: catalog?.slug,
      billing: catalog?.billing,
    };
  });
}

async function coveredUntil(cardId: string): Promise<string> {
  const latest = await prisma.statement.findFirst({ where: { cardId }, orderBy: { periodEnd: 'desc' } });
  return latest ? isoDay(latest.periodEnd) : isoDay(new Date());
}

/**
 * Brings tracked subscriptions up to date with the statement: real amounts and
 * billing days, price increases, charges after a cancellation, and proof that
 * a cancellation worked.
 */
async function reconcile(user: User, card: Card, history: Charge[], asOf: string) {
  const subs = await prisma.subscription.findMany({
    where: { userId: user.id, merchantKey: { not: null }, OR: [{ cardId: null }, { cardId: card.id }] },
  });
  const byKey = new Map<string, Charge[]>();
  for (const c of history) byKey.set(c.merchantKey, [...(byKey.get(c.merchantKey) ?? []), c]);

  const alerts: { type: string; title: string; body: string }[] = [];
  const updated: string[] = [];
  const verified: string[] = [];

  const addAlert = async (subscriptionId: string, type: 'STILL_CHARGING' | 'PRICE_INCREASE' | 'VERIFIED_CANCEL', title: string, body: string) => {
    const exists = await prisma.alert.findFirst({ where: { userId: user.id, subscriptionId, type, body } });
    if (exists) return;
    await prisma.alert.create({ data: { userId: user.id, subscriptionId, type, title, body } });
    alerts.push({ type, title, body });
  };

  for (const sub of subs) {
    const charges = byKey.get(sub.merchantKey!) ?? [];
    const latest = charges[charges.length - 1];

    if (sub.status === 'ACTIVE') {
      if (!latest) continue;
      const storedLast = sub.lastChargedAt ? isoDay(sub.lastChargedAt) : '';
      if (latest.date > storedLast || sub.cardId === null) {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            cardId: card.id,
            lastChargedLocal: latest.amountLocal,
            lastChargedAt: dayToDate(latest.date),
            nextRenewal: dayToDate(latest.date),
            // A real charge on or after the trial end means the trial became paid.
            ...(sub.trialEndsAt && latest.date >= isoDay(sub.trialEndsAt) ? { trialEndsAt: null } : {}),
            ...(latest.amountOriginal && latest.originalCurrency
              ? { priceOriginal: latest.amountOriginal, currency: latest.originalCurrency }
              : {}),
          },
        });
        updated.push(sub.id);
      }
      const previous = charges[charges.length - 2];
      if (previous && latest.billing !== 'USAGE' && isPriceIncrease(previous, latest)) {
        const unit = latest.amountOriginal ? latest.originalCurrency : card.currency;
        const before = latest.amountOriginal ? previous.amountOriginal : previous.amountLocal;
        const after = latest.amountOriginal ?? latest.amountLocal;
        await addAlert(sub.id, 'PRICE_INCREASE', `${sub.name} costs more`, `${sub.name} went from ${unit} ${before} to ${unit} ${after} on ${latest.date}.`);
      }
      continue;
    }

    // Cancelled subscriptions
    const cancelDay = sub.cancelledAt ? isoDay(sub.cancelledAt) : undefined;
    if (!cancelDay) continue;
    const after = charges.filter((c) => c.date > cancelDay);
    const lastAfter = after[after.length - 1];
    if (lastAfter) {
      await addAlert(
        sub.id,
        'STILL_CHARGING',
        `${sub.name} is still charging you`,
        `You marked ${sub.name} as cancelled, but it charged ${card.currency} ${lastAfter.amountLocal} on ${lastAfter.date}. Check that the cancellation went through.`,
      );
      if (sub.verifiedAt) await prisma.subscription.update({ where: { id: sub.id }, data: { verifiedAt: null } });
      continue;
    }
    const cycleDays = CADENCE_DAYS[sub.cadence];
    const lastCharge = sub.lastChargedAt ? isoDay(sub.lastChargedAt) : cancelDay;
    const dueBy = addDays(lastCharge, Math.round(cycleDays * 1.2));
    if (!sub.verifiedAt && asOf >= dueBy && asOf > cancelDay) {
      await prisma.subscription.update({ where: { id: sub.id }, data: { verifiedAt: new Date() } });
      await addAlert(sub.id, 'VERIFIED_CANCEL', `${sub.name} cancellation confirmed`, `No ${sub.name} charge since you cancelled. Your card is clear of it.`);
      verified.push(sub.id);
    }
  }
  return { alerts, updated, verified };
}

function isPriceIncrease(previous: Charge, latest: Charge): boolean {
  if (previous.amountOriginal && latest.amountOriginal && previous.originalCurrency === latest.originalCurrency) {
    return latest.amountOriginal > previous.amountOriginal * 1.03;
  }
  // Without the original price, allow for exchange-rate movement.
  return latest.amountLocal > previous.amountLocal * 1.15;
}

function addDays(day: string, days: number): string {
  const d = dayToDate(day);
  d.setUTCDate(d.getUTCDate() + days);
  return isoDay(d);
}

async function createCandidates(user: User, statementId: string, detections: Detection[], merchantIds: Map<string, string>) {
  const [subs, previous] = await Promise.all([
    prisma.subscription.findMany({ where: { userId: user.id }, select: { merchantKey: true } }),
    prisma.candidate.findMany({ where: { userId: user.id, decision: { in: ['PENDING', 'REJECTED'] } } }),
  ]);
  const tracked = new Set(subs.map((s) => s.merchantKey));
  const rejected = new Set(previous.filter((c) => c.decision === 'REJECTED').map((c) => c.merchantKey));

  const fresh = detections.filter((d) => d.verdict !== 'NOT_SUBSCRIPTION' && !tracked.has(d.merchantKey) && !rejected.has(d.merchantKey));

  // A newer statement replaces older pending suggestions for the same merchant.
  const replaced = previous.filter((c) => c.decision === 'PENDING' && fresh.some((d) => d.merchantKey === c.merchantKey));
  if (replaced.length) await prisma.candidate.deleteMany({ where: { id: { in: replaced.map((c) => c.id) } } });

  return prisma.candidate.createManyAndReturn({
    data: fresh.map((d) => ({
      userId: user.id,
      statementId,
      merchantId: d.merchantSlug ? merchantIds.get(d.merchantSlug) : undefined,
      merchantKey: d.merchantKey,
      merchantName: d.merchant,
      confidence: d.verdict as 'CONFIRMED' | 'LIKELY' | 'CHECK',
      reason: d.reason,
      cadence: d.cadence,
      chargeCount: d.charges,
      firstCharge: dayToDate(d.firstCharge),
      lastCharge: dayToDate(d.lastCharge),
      lastAmountLocal: d.lastAmountLocal,
      priceOriginal: d.priceOriginal,
      originalCurrency: d.originalCurrency,
    })),
  });
}

/** `currency` is the card currency that lastAmountLocal is in. */
export function serializeCandidate(c: Candidate, currency: string) {
  const catalog = CATALOG_BY_SLUG.get(c.merchantKey);
  return {
    id: c.id,
    statementId: c.statementId,
    merchantKey: c.merchantKey,
    name: c.merchantName,
    category: catalog?.category ?? null,
    brandColor: catalog?.brandColor ?? null,
    confidence: c.confidence,
    reason: c.reason,
    cadence: c.cadence,
    chargeCount: c.chargeCount,
    firstCharge: isoDay(c.firstCharge),
    lastCharge: isoDay(c.lastCharge),
    lastAmountLocal: num(c.lastAmountLocal),
    currency,
    priceOriginal: num(c.priceOriginal) ?? null,
    originalCurrency: c.originalCurrency,
    decision: c.decision,
  };
}
