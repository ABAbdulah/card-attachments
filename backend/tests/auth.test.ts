import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, resetDb } from './helpers.js';

const sent: { email: string; code: string }[] = [];
vi.mock('../src/modules/auth/email.js', () => ({
  sendLoginCode: async (email: string, code: string) => {
    sent.push({ email, code });
  },
}));

beforeEach(async () => {
  sent.length = 0;
  await resetDb();
});

async function signIn(email: string) {
  await api().post('/auth/otp/request').send({ email }).expect(200);
  const { code } = sent[sent.length - 1]!;
  const res = await api().post('/auth/otp/verify').send({ email, code }).expect(200);
  return res.body as { accessToken: string; refreshToken: string; user: { email: string; onboarded: boolean } };
}

describe('email code sign-in', () => {
  it('signs in with the emailed code and creates the account', async () => {
    const session = await signIn('New.User@Example.com');
    expect(session.user).toMatchObject({ email: 'new.user@example.com', onboarded: false });

    const me = await api().get('/me').set('Authorization', `Bearer ${session.accessToken}`).expect(200);
    expect(me.body.user.email).toBe('new.user@example.com');
    expect(me.body.limits).toEqual({ statements: 1, manualSubscriptions: 5 });
  });

  it('rejects a wrong code and locks the code after five tries', async () => {
    await api().post('/auth/otp/request').send({ email: 'a@example.com' }).expect(200);
    const { code } = sent[0]!;
    const wrong = code === '000000' ? '111111' : '000000';

    for (let i = 0; i < 5; i++) {
      const res = await api().post('/auth/otp/verify').send({ email: 'a@example.com', code: wrong }).expect(400);
      expect(res.body.code).toBe('CODE_INVALID');
    }
    const locked = await api().post('/auth/otp/verify').send({ email: 'a@example.com', code }).expect(400);
    expect(locked.body.code).toBe('CODE_EXPIRED');
  });

  it('does not accept the same code twice', async () => {
    await signIn('b@example.com');
    const { code } = sent[0]!;
    const again = await api().post('/auth/otp/verify').send({ email: 'b@example.com', code }).expect(400);
    expect(again.body.code).toBe('CODE_EXPIRED');
  });

  it('rotates refresh tokens and revokes everything when an old one is reused', async () => {
    const session = await signIn('c@example.com');
    const first = await api().post('/auth/refresh').send({ refreshToken: session.refreshToken }).expect(200);
    expect(first.body.refreshToken).not.toBe(session.refreshToken);

    // Reusing the rotated token looks like theft: every session ends.
    await api().post('/auth/refresh').send({ refreshToken: session.refreshToken }).expect(401);
    await api().post('/auth/refresh').send({ refreshToken: first.body.refreshToken }).expect(401);
  });

  it('requires a token for protected routes', async () => {
    const res = await api().get('/dashboard').expect(401);
    expect(res.body.code).toBe('UNAUTHENTICATED');
    await api().get('/dashboard').set('Authorization', 'Bearer not-a-token').expect(401);
  });

  it('deletes the account and everything in it', async () => {
    const session = await signIn('d@example.com');
    const auth = { Authorization: `Bearer ${session.accessToken}` };
    await api().delete('/me').set(auth).expect(204);
    await api().get('/me').set(auth).expect(401);
  });
});
