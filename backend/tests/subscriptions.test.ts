import { beforeEach, describe, expect, it } from 'vitest';
import { api, createUser, resetDb } from './helpers.js';

beforeEach(resetDb);

const addSpotify = (auth: Record<string, string>, overrides: Record<string, unknown> = {}) =>
  api()
    .post('/subscriptions')
    .set(auth)
    .send({ merchantSlug: 'spotify', name: 'Spotify', cadence: 'MONTHLY', priceOriginal: 2, currency: 'USD', nextRenewal: '2026-01-10', ...overrides });

describe('subscriptions', () => {
  it('adds a manual subscription, converts its cost and awards XP', async () => {
    const { auth } = await createUser();
    const res = await addSpotify(auth).expect(201);

    expect(res.body.subscription).toMatchObject({
      name: 'Spotify',
      merchantSlug: 'spotify',
      category: 'Music',
      status: 'ACTIVE',
      source: 'MANUAL',
      cost: { perCharge: 600, monthly: 600, yearly: 7200, basis: 'estimated' },
    });
    expect(res.body.subscription.nextRenewal >= new Date().toISOString().slice(0, 10)).toBe(true);
    expect(res.body.rewards).toMatchObject({ xpGained: 10, totalXp: 10 });
  });

  it('scales weekly and yearly prices to a monthly cost', async () => {
    const { auth } = await createUser();
    const yearly = await addSpotify(auth, { merchantSlug: undefined, name: 'Domain', cadence: 'YEARLY', priceOriginal: 12 }).expect(201);
    expect(yearly.body.subscription.cost).toMatchObject({ perCharge: 3600, monthly: 300 });
  });

  it('refuses a second active entry for the same service', async () => {
    const { auth } = await createUser();
    await addSpotify(auth).expect(201);
    const dup = await addSpotify(auth).expect(409);
    expect(dup.body.code).toBe('DUPLICATE');
  });

  it('celebrates a cancellation once, with XP and the first badge', async () => {
    const { auth } = await createUser();
    const { body } = await addSpotify(auth).expect(201);

    const cancel = await api().post(`/subscriptions/${body.subscription.id}/status`).set(auth).send({ status: 'CANCELLED' }).expect(200);
    expect(cancel.body.subscription.status).toBe('CANCELLED');
    expect(cancel.body.rewards.xpGained).toBe(50);
    expect(cancel.body.rewards.newBadges.map((b: { id: string }) => b.id)).toContain('first-cut');

    await api().post(`/subscriptions/${body.subscription.id}/status`).set(auth).send({ status: 'ACTIVE' }).expect(200);
    const again = await api().post(`/subscriptions/${body.subscription.id}/status`).set(auth).send({ status: 'CANCELLED' }).expect(200);
    expect(again.body.rewards.xpGained).toBe(0);
  });

  it('enforces the free plan limit with a paywall code', async () => {
    const { auth } = await createUser();
    for (let i = 0; i < 5; i++) {
      await addSpotify(auth, { merchantSlug: undefined, name: `Service ${i}` }).expect(201);
    }
    const blocked = await addSpotify(auth, { merchantSlug: undefined, name: 'Service 6' }).expect(402);
    expect(blocked.body.code).toBe('PLAN_LIMIT');
  });

  it('keeps users apart', async () => {
    const alice = await createUser('alice@example.com');
    const bob = await createUser('bob@example.com');
    const { body } = await addSpotify(alice.auth).expect(201);

    await api().get(`/subscriptions/${body.subscription.id}`).set(bob.auth).expect(404);
    await api().post(`/subscriptions/${body.subscription.id}/status`).set(bob.auth).send({ status: 'CANCELLED' }).expect(404);
    const list = await api().get('/subscriptions').set(bob.auth).expect(200);
    expect(list.body.subscriptions).toEqual([]);
  });

  it('builds the dashboard totals and savings', async () => {
    const { auth } = await createUser();
    await addSpotify(auth).expect(201);
    const netflix = await addSpotify(auth, { merchantSlug: 'netflix', name: 'Netflix', priceOriginal: 10 }).expect(201);
    await api().post(`/subscriptions/${netflix.body.subscription.id}/status`).set(auth).send({ status: 'CANCELLED' }).expect(200);

    const dash = await api().get('/dashboard').set(auth).expect(200);
    expect(dash.body).toMatchObject({
      currency: 'PKR',
      monthlyAverage: 600,
      yearlyTotal: 7200,
      dueThisMonth: 600,
      savedMonthly: 3000,
      activeCount: 1,
      cancelledCount: 1,
    });
    expect(dash.body.progress.xp).toBe(70);
  });

  it('searches the merchant catalog', async () => {
    const { auth } = await createUser();
    const res = await api().get('/merchants?q=chat').set(auth).expect(200);
    expect(res.body.merchants.map((m: { slug: string }) => m.slug)).toContain('chatgpt');
    const all = await api().get('/merchants').set(auth).expect(200);
    expect(all.body.merchants.some((m: { slug: string }) => m.slug === 'upwork')).toBe(false);
  });
});

describe('free trials', () => {
  const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

  it('shows a running trial, its first charge date, and no charge before it ends', async () => {
    const { auth } = await createUser();
    const trialEnd = inDays(5);
    const res = await addSpotify(auth, { merchantSlug: 'netflix', name: 'Netflix', priceOriginal: 10, nextRenewal: inDays(40), trialEndsAt: trialEnd }).expect(201);
    expect(res.body.subscription).toMatchObject({ trialEndsAt: trialEnd, nextRenewal: trialEnd });

    const dash = await api().get('/dashboard').set(auth).expect(200);
    expect(dash.body.trialsEnding).toEqual([expect.objectContaining({ name: 'Netflix', date: trialEnd, amount: 3000 })]);
    expect(dash.body.upcoming[0]).toMatchObject({ name: 'Netflix', trial: true });
    expect(dash.body.paidThisMonth).toBe(0);
  });

  it('clears the trial when it is edited away', async () => {
    const { auth } = await createUser();
    const { body } = await addSpotify(auth, { trialEndsAt: inDays(3) }).expect(201);
    const updated = await api().patch(`/subscriptions/${body.subscription.id}`).set(auth).send({ trialEndsAt: null }).expect(200);
    expect(updated.body.subscription.trialEndsAt).toBeNull();
  });
});

describe('legal pages', () => {
  it('serves the privacy policy and terms publicly', async () => {
    const privacy = await api().get('/privacy').expect(200);
    expect(privacy.text).toContain('<h1>CardSweep privacy policy</h1>');
    const terms = await api().get('/terms').expect(200);
    expect(terms.text).toContain('cannot cancel subscriptions for you');
  });
});
