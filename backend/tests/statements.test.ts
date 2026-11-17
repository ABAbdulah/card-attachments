import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { api, createUser, csv, resetDb } from './helpers.js';

beforeEach(resetDb);

const AUG_TO_OCT = csv([
  ['2026-08-02', 'Spotify P1 Stockholm Swe', -467.47],
  ['2026-08-03', 'From Someone Person (Meezan Bank)', 5000],
  ['2026-08-05', 'Apg*daewoo Pakist Lahore', -1670],
  ['2026-08-30', 'Spotify P2 Stockholm Swe', -467.47],
  ['2026-09-06', 'Apg*daewoo Pakist Lahore', -1670],
  ['2026-09-10', 'To Another Person (Easypaisa)', -3000],
  ['2026-09-30', 'Spotify P3 Stockholm Swe', -467.47],
  ['2026-10-01', 'Netflix.com Amsterdam', -1100],
  ['2026-10-20', 'Kfc Karachi', -1560],
]);

function upload(auth: Record<string, string>, file: Buffer, name = 'statement.csv') {
  return api().post('/statements').set(auth).attach('file', file, { filename: name, contentType: 'text/csv' });
}

describe('statement import', () => {
  it('stores only card charges and suggests subscriptions for review', async () => {
    const { user, auth } = await createUser();
    const res = await upload(auth, AUG_TO_OCT).expect(201);

    expect(res.body.statement).toMatchObject({ charges: 7, duplicates: 0, periodStart: '2026-08-02', periodEnd: '2026-10-20' });
    const stored = await prisma.transaction.findMany({ where: { card: { userId: user.id } } });
    expect(stored.some((t) => /Person/.test(t.rawDescription))).toBe(false);

    const suggested = Object.fromEntries(res.body.candidates.map((c: { name: string; confidence: string }) => [c.name, c.confidence]));
    expect(suggested).toEqual({ Spotify: 'CONFIRMED', Netflix: 'LIKELY' });
    expect(res.body.rewards.newBadges.map((b: { id: string }) => b.id)).toContain('first-scan');
  });

  it('turns confirmed suggestions into subscriptions priced at what the bank charged', async () => {
    const { auth } = await createUser();
    const { body } = await upload(auth, AUG_TO_OCT).expect(201);
    const spotify = body.candidates.find((c: { name: string }) => c.name === 'Spotify');
    const netflix = body.candidates.find((c: { name: string }) => c.name === 'Netflix');

    const review = await api()
      .post('/candidates/review')
      .set(auth)
      .send({ decisions: [{ id: spotify.id, accept: true }, { id: netflix.id, accept: false }] })
      .expect(200);

    expect(review.body.subscriptions).toHaveLength(1);
    expect(review.body.subscriptions[0]).toMatchObject({
      name: 'Spotify',
      source: 'DETECTED',
      lastChargedLocal: 467.47,
      cost: { perCharge: 467.47, basis: 'actual' },
    });
    // 20 XP for the confirmation + 25 for reviewing everything.
    expect(review.body.rewards.xpGained).toBe(45);
    const pending = await api().get('/candidates').set(auth).expect(200);
    expect(pending.body.candidates).toEqual([]);
  });

  it('keeps two identical charges on the same day', async () => {
    const { user, auth } = await createUser();
    const res = await upload(
      auth,
      csv([
        ['2026-08-29', 'Mob*intellectual Prope Islamabad Pak', -3085.26],
        ['2026-08-29', 'Mob*intellectual Prope Islamabad Pak', -3085.26],
      ]),
    ).expect(201);
    expect(res.body.statement).toMatchObject({ charges: 2, duplicates: 0 });
    expect(await prisma.transaction.count({ where: { card: { userId: user.id } } })).toBe(2);
  });

  it('allows one scan on the free plan', async () => {
    const { auth } = await createUser();
    await upload(auth, AUG_TO_OCT).expect(201);
    const second = await upload(auth, AUG_TO_OCT).expect(402);
    expect(second.body.code).toBe('PLAN_LIMIT');
  });

  it('skips charges already imported from an overlapping statement', async () => {
    const { auth } = await createUser('pro@example.com', 'PRO');
    await upload(auth, AUG_TO_OCT).expect(201);
    const again = await upload(auth, AUG_TO_OCT).expect(201);
    expect(again.body.statement).toMatchObject({ charges: 7, duplicates: 7 });
  });

  it('warns when a cancelled subscription charges again', async () => {
    const { user, auth } = await createUser('pro@example.com', 'PRO');
    const first = await upload(auth, AUG_TO_OCT).expect(201);
    const spotify = first.body.candidates.find((c: { name: string }) => c.name === 'Spotify');
    const review = await api().post('/candidates/review').set(auth).send({ decisions: [{ id: spotify.id, accept: true }] }).expect(200);
    const subId = review.body.subscriptions[0].id;

    await api().post(`/subscriptions/${subId}/status`).set(auth).send({ status: 'CANCELLED' }).expect(200);
    await prisma.subscription.update({ where: { id: subId }, data: { cancelledAt: new Date('2026-10-05T12:00:00Z') } });

    const later = await upload(auth, csv([['2026-10-30', 'Spotify P4 Stockholm Swe', -467.47]])).expect(201);
    expect(later.body.alerts).toEqual([expect.objectContaining({ type: 'STILL_CHARGING', title: 'Spotify is still charging you' })]);

    const alerts = await api().get('/alerts').set(auth).expect(200);
    expect(alerts.body.alerts).toHaveLength(1);
    expect(await prisma.alert.count({ where: { userId: user.id } })).toBe(1);
  });

  it('verifies a cancellation once a later statement shows no renewal', async () => {
    const { auth } = await createUser('pro@example.com', 'PRO');
    const first = await upload(auth, AUG_TO_OCT).expect(201);
    const spotify = first.body.candidates.find((c: { name: string }) => c.name === 'Spotify');
    const review = await api().post('/candidates/review').set(auth).send({ decisions: [{ id: spotify.id, accept: true }] }).expect(200);
    const subId = review.body.subscriptions[0].id;

    await api().post(`/subscriptions/${subId}/status`).set(auth).send({ status: 'CANCELLED' }).expect(200);
    await prisma.subscription.update({ where: { id: subId }, data: { cancelledAt: new Date('2026-10-05T12:00:00Z') } });

    const later = await upload(auth, csv([['2026-11-20', 'Kfc Karachi', -900]])).expect(201);
    expect(later.body.alerts).toEqual([expect.objectContaining({ type: 'VERIFIED_CANCEL' })]);
    expect(later.body.rewards.xpGained).toBe(130);
    expect(later.body.rewards.newBadges.map((b: { id: string }) => b.id)).toContain('verified');
  });

  it('lists every merchant that has charged the card', async () => {
    const { auth } = await createUser();
    await upload(auth, AUG_TO_OCT).expect(201);
    const res = await api().get('/cards/exposure').set(auth).expect(200);
    const names = res.body.merchants.map((m: { name: string }) => m.name).sort();
    expect(names).toEqual(['Daewoo Pakist', 'Kfc Karachi', 'Netflix', 'Spotify']);
  });

  it('explains files it cannot read', async () => {
    const { auth } = await createUser();
    const res = await upload(auth, Buffer.from('hello there\nnothing useful'), 'notes.txt').expect(422);
    expect(res.body.code).toBe('UNSUPPORTED_FORMAT');
    const image = await api().post('/statements').set(auth).attach('file', Buffer.from([0xff, 0xd8]), { filename: 'a.jpg', contentType: 'image/jpeg' }).expect(415);
    expect(image.body.code).toBe('UNSUPPORTED_FILE');
  });
});
