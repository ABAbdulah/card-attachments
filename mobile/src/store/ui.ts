import { create } from 'zustand';
import type { Rewards } from '../api/types';

type Toast = {
  id: number;
  message: string;
  tone: 'info' | 'success' | 'error';
};

type Celebration = {
  title: string;
  subtitle?: string;
  rewards?: Rewards | null;
};

type UiState = {
  toast: Toast | null;
  celebration: Celebration | null;
  showToast: (message: string, tone?: Toast['tone']) => void;
  hideToast: () => void;
  celebrate: (celebration: Celebration) => void;
  endCelebration: () => void;
};

let toastId = 0;

export const useUi = create<UiState>(set => ({
  toast: null,
  celebration: null,
  showToast: (message, tone = 'info') =>
    set({ toast: { id: ++toastId, message, tone } }),
  hideToast: () => set({ toast: null }),
  celebrate: celebration => set({ celebration }),
  endCelebration: () => set({ celebration: null }),
}));

export const toast = (message: string, tone?: Toast['tone']) =>
  useUi.getState().showToast(message, tone);

/** Celebrate only when something was actually earned (XP is never awarded twice for the same action). */
export function celebrateRewards(
  title: string,
  rewards: Rewards | null | undefined,
  subtitle?: string,
) {
  if (!rewards || (rewards.xpGained === 0 && rewards.newBadges.length === 0)) {
    toast(title, 'success');
    return;
  }
  useUi.getState().celebrate({ title, subtitle, rewards });
}
