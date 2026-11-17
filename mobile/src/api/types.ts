import type { Cadence } from '../lib/format';

export type { Cadence };
export type Plan = 'FREE' | 'PRO';
export type Confidence = 'CONFIRMED' | 'LIKELY' | 'CHECK';
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED';

export type User = {
  id: string;
  email: string;
  displayName: string | null;
  homeCurrency: string;
  plan: Plan;
  savingsGoalMonthly: number | null;
  onboarded: boolean;
  createdAt: string;
};

export type MeResponse = {
  user: User;
  usage: { statements: number; manualSubscriptions: number };
  limits: { statements: number; manualSubscriptions: number } | null;
};

export type Session = { accessToken: string; refreshToken: string };

export type Rewards = {
  xpGained: number;
  totalXp: number;
  level: number;
  leveledUp: boolean;
  newBadges: { id: string; name: string }[];
};

export type Cost = { perCharge: number; monthly: number; yearly: number; basis: 'actual' | 'estimated' };

export type Subscription = {
  id: string;
  name: string;
  merchantSlug: string | null;
  category: string | null;
  brandColor: string | null;
  manageUrl: string | null;
  billing: 'FIXED' | 'USAGE' | 'PURCHASE' | null;
  cadence: Cadence;
  priceOriginal: number;
  currency: string;
  status: SubscriptionStatus;
  source: 'DETECTED' | 'MANUAL';
  confidence: Confidence | null;
  card: { id: string; nickname: string; currency: string } | null;
  lastChargedLocal: number | null;
  lastChargedAt: string | null;
  nextRenewal: string | null;
  cost: Cost;
  cancelledAt: string | null;
  verifiedAt: string | null;
  notes: string | null;
  createdAt: string;
};

export type SubscriptionDetail = {
  subscription: Subscription;
  charges: {
    id: string;
    date: string;
    amountLocal: number;
    currency: string;
    amountOriginal: number | null;
    originalCurrency: string | null;
    card: string;
  }[];
  totalPaid: number;
  cancelGuide: { manageUrl: string | null; steps: string[] };
};

export type Merchant = {
  slug: string;
  name: string;
  category: string;
  billing: 'FIXED' | 'USAGE' | 'PURCHASE';
  brandColor: string | null;
  manageUrl: string | null;
  typicalPrice: number | null;
  typicalCurrency: string | null;
  typicalCadence: Cadence | null;
};

export type Dashboard = {
  currency: string;
  dueThisMonth: number;
  paidThisMonth: number;
  remainingThisMonth: number;
  monthlyAverage: number;
  yearlyTotal: number;
  savedMonthly: number;
  activeCount: number;
  cancelledCount: number;
  upcoming: { id: string; name: string; brandColor: string | null; date: string; amount: number }[];
  categories: { name: string; monthly: number }[];
  unreadAlerts: number;
  pendingCandidates: number;
  statements: number;
  progress: {
    xp: number;
    level: number;
    title: string;
    levelStartXp: number;
    nextLevelXp: number | null;
    streak: { months: number; activeThisMonth: boolean };
  };
};

export type Card = {
  id: string;
  nickname: string;
  bank: string | null;
  last4: string | null;
  currency: string;
  activeSubscriptions: number;
  statements: number;
  coveredUntil: string | null;
};

export type ExposureMerchant = {
  key: string;
  name: string;
  category: string | null;
  brandColor: string | null;
  manageUrl: string | null;
  billing: 'FIXED' | 'USAGE' | 'PURCHASE' | null;
  chargeCount: number;
  total: number;
  firstCharge: string;
  lastCharge: string;
  cards: string[];
  subscriptionId: string | null;
  subscriptionStatus: SubscriptionStatus | null;
};

export type Candidate = {
  id: string;
  statementId: string;
  merchantKey: string;
  name: string;
  category: string | null;
  brandColor: string | null;
  confidence: Confidence;
  reason: string;
  cadence: Cadence | null;
  chargeCount: number;
  firstCharge: string;
  lastCharge: string;
  lastAmountLocal: number;
  /** Currency of lastAmountLocal (the card's currency). */
  currency: string;
  priceOriginal: number | null;
  originalCurrency: string | null;
};

export type ImportResult = {
  statement: {
    id: string;
    bank: string;
    card: { id: string; nickname: string };
    periodStart: string;
    periodEnd: string;
    charges: number;
    duplicates: number;
    merchants: number;
  };
  candidates: Candidate[];
  updatedSubscriptions: string[];
  alerts: { type: string; title: string; body: string }[];
  rewards: Rewards;
};

export type StatementSummary = {
  id: string;
  bank: string;
  card: string;
  periodStart: string;
  periodEnd: string;
  charges: number;
  duplicates: number;
  importedAt: string;
};

export type Progress = {
  xp: number;
  level: number;
  title: string;
  levelStartXp: number;
  nextLevelXp: number | null;
  streak: { months: number; activeThisMonth: boolean };
  savings: { currency: string; monthly: number; lifetime: number; activeMonthly: number; goalMonthly: number | null };
  badges: { id: string; name: string; description: string; earned: boolean; earnedAt: string | null }[];
  recent: { id: string; label: string; xp: number; at: string }[];
};

export type AppAlert = {
  id: string;
  type: 'STILL_CHARGING' | 'PRICE_INCREASE' | 'VERIFIED_CANCEL';
  title: string;
  body: string;
  subscriptionId: string | null;
  createdAt: string;
  read: boolean;
};
