import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type {
  AppAlert,
  Cadence,
  Candidate,
  Card,
  Dashboard,
  ExposureMerchant,
  ImportResult,
  MeResponse,
  Merchant,
  Progress,
  Rewards,
  StatementSummary,
  Subscription,
  SubscriptionDetail,
  SubscriptionStatus,
  User,
} from './types';

export const keys = {
  me: ['me'] as const,
  dashboard: ['dashboard'] as const,
  subscriptions: ['subscriptions'] as const,
  subscription: (id: string) => ['subscriptions', id] as const,
  merchants: (q: string) => ['merchants', q] as const,
  cards: ['cards'] as const,
  exposure: ['exposure'] as const,
  candidates: ['candidates'] as const,
  statements: ['statements'] as const,
  progress: ['progress'] as const,
  alerts: ['alerts'] as const,
  billingConfig: ['billing-config'] as const,
};

/** Most changes move totals, XP and badges: refresh every screen that shows them. */
function useInvalidateMoney() {
  const qc = useQueryClient();
  return () =>
    Promise.all(
      [keys.dashboard, keys.subscriptions, keys.progress, keys.exposure, keys.cards, keys.candidates, keys.alerts, keys.me].map((key) =>
        qc.invalidateQueries({ queryKey: key }),
      ),
    );
}

export const useMe = () => useQuery({ queryKey: keys.me, queryFn: () => api<MeResponse>('/me') });
export const useDashboard = () => useQuery({ queryKey: keys.dashboard, queryFn: () => api<Dashboard>('/dashboard') });
export const useSubscriptions = () =>
  useQuery({ queryKey: keys.subscriptions, queryFn: () => api<{ currency: string; subscriptions: Subscription[] }>('/subscriptions') });
export const useSubscription = (id: string) =>
  useQuery({ queryKey: keys.subscription(id), queryFn: () => api<SubscriptionDetail>(`/subscriptions/${id}`), enabled: !!id });
export const useMerchants = (q: string) =>
  useQuery({
    queryKey: keys.merchants(q),
    queryFn: () => api<{ merchants: Merchant[] }>(`/merchants${q ? `?q=${encodeURIComponent(q)}` : ''}`),
    placeholderData: (previous) => previous,
    staleTime: 10 * 60_000,
  });
export const useCards = () => useQuery({ queryKey: keys.cards, queryFn: () => api<{ cards: Card[] }>('/cards') });
export const useExposure = () =>
  useQuery({ queryKey: keys.exposure, queryFn: () => api<{ currency: string; merchants: ExposureMerchant[] }>('/cards/exposure') });
export const useCandidates = () => useQuery({ queryKey: keys.candidates, queryFn: () => api<{ candidates: Candidate[] }>('/candidates') });
export const useStatements = () => useQuery({ queryKey: keys.statements, queryFn: () => api<{ statements: StatementSummary[] }>('/statements') });
export const useProgress = () => useQuery({ queryKey: keys.progress, queryFn: () => api<Progress>('/progress') });
export const useAlerts = () => useQuery({ queryKey: keys.alerts, queryFn: () => api<{ alerts: AppAlert[] }>('/alerts') });
export const useBillingConfig = () =>
  useQuery({
    queryKey: keys.billingConfig,
    queryFn: () => api<{ purchasesEnabled: boolean; devPlanSwitch: boolean }>('/billing/config', { auth: false }),
  });

export type SubscriptionInput = {
  merchantSlug?: string;
  name: string;
  cadence: Cadence;
  priceOriginal: number;
  currency: string;
  nextRenewal: string;
  cardId?: string | null;
  notes?: string | null;
};

export function useCreateSubscription() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: (input: SubscriptionInput) =>
      api<{ subscription: Subscription; rewards: Rewards }>('/subscriptions', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateSubscription(id: string) {
  const invalidate = useInvalidateMoney();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Omit<SubscriptionInput, 'merchantSlug'>>) =>
      api<{ subscription: Subscription }>(`/subscriptions/${id}`, { method: 'PATCH', body: input }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.subscription(id) });
      await invalidate();
    },
  });
}

export function useSetStatus() {
  const invalidate = useInvalidateMoney();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: SubscriptionStatus }) =>
      api<{ subscription: Subscription; rewards: Rewards | null }>(`/subscriptions/${id}/status`, { method: 'POST', body: { status } }),
    // Flip the toggle instantly; the server response confirms it.
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: keys.subscriptions });
      const previous = qc.getQueryData<{ currency: string; subscriptions: Subscription[] }>(keys.subscriptions);
      if (previous) {
        qc.setQueryData(keys.subscriptions, {
          ...previous,
          subscriptions: previous.subscriptions.map((s) => (s.id === id ? { ...s, status } : s)),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(keys.subscriptions, context.previous);
    },
    onSettled: async (_data, _err, { id }) => {
      await qc.invalidateQueries({ queryKey: keys.subscription(id) });
      await invalidate();
    },
  });
}

export function useDeleteSubscription() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/subscriptions/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

export type PickedFile = { uri: string; name: string; type: string };

export function useImportStatement() {
  const invalidate = useInvalidateMoney();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, password, cardId }: { file: PickedFile; password?: string; cardId?: string }) => {
      const form = new FormData();
      // React Native's FormData accepts { uri, name, type } for file parts.
      form.append('file', file as unknown as Blob);
      if (password) form.append('password', password);
      if (cardId) form.append('cardId', cardId);
      return api<ImportResult>('/statements', { method: 'POST', form, timeoutMs: 120_000 });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.statements });
      await invalidate();
    },
  });
}

export function useDeleteStatement() {
  const invalidate = useInvalidateMoney();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/statements/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.statements });
      await invalidate();
    },
  });
}

export function useReviewCandidates() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: (decisions: { id: string; accept: boolean; cadence?: Cadence }[]) =>
      api<{ subscriptions: Subscription[]; rewards: Rewards }>('/candidates/review', { method: 'POST', body: { decisions } }),
    onSuccess: invalidate,
  });
}

export function useUpdateMe() {
  const invalidate = useInvalidateMoney();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Pick<User, 'displayName' | 'homeCurrency' | 'savingsGoalMonthly' | 'onboarded'>>) =>
      api<{ user: User }>('/me', { method: 'PATCH', body: input }),
    onSuccess: async ({ user }) => {
      qc.setQueryData<MeResponse>(keys.me, (old) => (old ? { ...old, user } : old));
      await invalidate();
    },
  });
}

export function useMarkAlertsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>('/alerts/read-all', { method: 'POST' }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.alerts });
      await qc.invalidateQueries({ queryKey: keys.dashboard });
    },
  });
}

export function useDevPlan() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: (plan: 'FREE' | 'PRO') => api<{ user: User }>('/billing/dev-plan', { method: 'POST', body: { plan } }),
    onSuccess: invalidate,
  });
}
