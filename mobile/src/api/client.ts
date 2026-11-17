import { API_URL } from '../config';
import { useSession } from '../store/session';
import type { Session } from './types';

/** An API failure with the server's message and stable code (PLAN_LIMIT, PASSWORD_REQUIRED, ...). */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
  }
}

type Options = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  form?: FormData;
  auth?: boolean;
  timeoutMs?: number;
};

let refreshing: Promise<Session | null> | null = null;

/** One refresh at a time: parallel 401s all wait for the same new token. */
function refreshSession(): Promise<Session | null> {
  if (!refreshing) {
    refreshing = (async () => {
      const current = useSession.getState().session;
      if (!current) return null;
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: current.refreshToken }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const next = (await res.json()) as Session;
        await useSession.getState().update(next);
        return next;
      } catch {
        await useSession.getState().signOut();
        return null;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const { method = 'GET', body, form, auth = true, timeoutMs = 30_000 } = options;

  const send = async (token?: string) => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(`${API_URL}${path}`, {
        method,
        headers,
        body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
        signal: controller.signal,
      });
    } catch (err) {
      const aborted = (err as Error)?.name === 'AbortError';
      throw new ApiError(
        aborted ? 'The server took too long to answer. Try again.' : 'Cannot reach SubTrack. Check your internet connection.',
        0,
        aborted ? 'TIMEOUT' : 'NETWORK',
      );
    } finally {
      clearTimeout(timer);
    }
  };

  let res = await send(auth ? useSession.getState().session?.accessToken : undefined);
  if (res.status === 401 && auth) {
    const next = await refreshSession();
    if (!next) throw new ApiError('Your session has ended. Sign in again.', 401, 'SESSION_EXPIRED');
    res = await send(next.accessToken);
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status, data.code);
  }
  return data as T;
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Something went wrong.';
}
