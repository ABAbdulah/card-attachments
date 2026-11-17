import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';

const secret = new TextEncoder().encode(env.JWT_SECRET);
const ACCESS_TTL = '15m';
const REFRESH_TTL_DAYS = 60;

export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function hashesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function signAccessToken(userId: string): Promise<string> {
  return new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject(userId).setIssuedAt().setExpirationTime(ACCESS_TTL).sign(secret);
}

export async function verifyAccessToken(token: string): Promise<string | undefined> {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    return payload.sub;
  } catch {
    return undefined;
  }
}

/** Issues an access token and a new opaque refresh token (only its hash is stored). */
export async function issueSession(userId: string) {
  const refreshToken = randomBytes(32).toString('base64url');
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 86_400_000),
    },
  });
  return { accessToken: await signAccessToken(userId), refreshToken };
}

/**
 * Rotates a refresh token. Reusing a token that was already rotated revokes
 * every session of that user, since it means the token leaked.
 */
export async function rotateRefreshToken(refreshToken: string) {
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: sha256(refreshToken) } });
  if (!stored || stored.expiresAt < new Date()) return undefined;

  if (stored.revokedAt) {
    await prisma.refreshToken.updateMany({ where: { userId: stored.userId, revokedAt: null }, data: { revokedAt: new Date() } });
    return undefined;
  }

  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
  return { userId: stored.userId, ...(await issueSession(stored.userId)) };
}

export async function revokeRefreshToken(refreshToken: string) {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: sha256(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
