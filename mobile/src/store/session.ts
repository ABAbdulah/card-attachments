import * as Keychain from 'react-native-keychain';
import { create } from 'zustand';
import type { Session } from '../api/types';

const SERVICE = 'subtrack.session';

type SessionState = {
  status: 'loading' | 'signedOut' | 'signedIn';
  session: Session | null;
  signIn: (session: Session) => Promise<void>;
  update: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
  restore: () => Promise<void>;
};

/** Tokens live in the iOS Keychain / Android Keystore, never in plain storage. */
export const useSession = create<SessionState>((set) => ({
  status: 'loading',
  session: null,

  restore: async () => {
    try {
      const stored = await Keychain.getGenericPassword({ service: SERVICE });
      if (stored) {
        set({ status: 'signedIn', session: JSON.parse(stored.password) as Session });
        return;
      }
    } catch {
      // A corrupt or unreadable entry means signing in again.
    }
    set({ status: 'signedOut', session: null });
  },

  signIn: async (session) => {
    await Keychain.setGenericPassword('session', JSON.stringify(session), { service: SERVICE });
    set({ status: 'signedIn', session });
  },

  update: async (session) => {
    await Keychain.setGenericPassword('session', JSON.stringify(session), { service: SERVICE });
    set({ session });
  },

  signOut: async () => {
    await Keychain.resetGenericPassword({ service: SERVICE });
    set({ status: 'signedOut', session: null });
  },
}));
