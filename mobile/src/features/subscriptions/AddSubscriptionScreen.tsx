import { ChevronRight, Plus, Search } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ApiError, errorMessage } from '../../api/client';
import { useCards, useCreateSubscription, useMe, useMerchants, useSubscription, useUpdateSubscription } from '../../api/queries';
import type { Cadence, Merchant } from '../../api/types';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Input } from '../../components/Input';
import { MerchantAvatar } from '../../components/MerchantAvatar';
import { Screen } from '../../components/Screen';
import { Segmented } from '../../components/Segmented';
import { SkeletonList } from '../../components/States';
import { Surface } from '../../components/Surface';
import { addDays, addMonths, formatMoney, isValidIsoDay, todayIso } from '../../lib/format';
import type { AppScreenProps } from '../../navigation/types';
import { celebrateRewards, toast } from '../../store/ui';
import { useTheme } from '../../theme';

type Draft = {
  merchantSlug?: string;
  brandColor?: string | null;
  name: string;
  price: string;
  currency: string;
  cadence: Cadence;
  nextRenewal: string;
  cardId: string | null;
  notes: string;
};

export function AddSubscriptionScreen({ route, navigation }: AppScreenProps<'AddSubscription'>) {
  const editingId = route.params?.subscriptionId;
  const me = useMe();
  const home = me.data?.user.homeCurrency ?? 'PKR';
  const [draft, setDraft] = useState<Draft | null>(null);
  const existing = useSubscription(editingId ?? '');

  // Editing opens straight on the form, pre-filled.
  useEffect(() => {
    const s = existing.data?.subscription;
    if (editingId && s && !draft) {
      setDraft({
        merchantSlug: s.merchantSlug ?? undefined,
        brandColor: s.brandColor,
        name: s.name,
        price: String(s.priceOriginal),
        currency: s.currency,
        cadence: s.cadence,
        nextRenewal: s.nextRenewal ?? todayIso(),
        cardId: s.card?.id ?? null,
        notes: s.notes ?? '',
      });
    }
  }, [editingId, existing.data, draft]);

  if (editingId && !draft) {
    return (
      <Screen leading="close" title="Edit subscription">
        <SkeletonList rows={3} />
      </Screen>
    );
  }

  if (!draft) {
    return (
      <CatalogPicker
        home={home}
        onPick={(m) =>
          setDraft({
            merchantSlug: m?.slug,
            brandColor: m?.brandColor,
            name: m?.name ?? '',
            price: m?.typicalPrice ? String(m.typicalPrice) : '',
            currency: m?.typicalCurrency ?? home,
            cadence: m?.typicalCadence ?? 'MONTHLY',
            nextRenewal: addMonths(todayIso(), 1),
            cardId: null,
            notes: '',
          })
        }
      />
    );
  }

  return (
    <SubscriptionForm
      draft={draft}
      setDraft={setDraft}
      home={home}
      editingId={editingId}
      onDone={() => navigation.goBack()}
      onPlanLimit={(reason) => navigation.replace('Paywall', { reason })}
    />
  );
}

function CatalogPicker({ home, onPick }: { home: string; onPick: (m: (Merchant & { custom?: string }) | null) => void }) {
  const { colors, spacing } = useTheme();
  const [query, setQuery] = useState('');
  const { data, isLoading } = useMerchants(query.trim());
  const merchants = data?.merchants ?? [];

  return (
    <Screen leading="close" title="Add a subscription" subtitle="Pick a service, or add your own.">
      <Input icon={Search} value={query} onChangeText={setQuery} placeholder="Search Netflix, ChatGPT, Spotify…" autoFocus returnKeyType="search" accessibilityLabel="Search services" />
      {query.trim() ? (
        <Surface
          onPress={() => onPick({ custom: query.trim(), name: query.trim() } as Merchant & { custom: string })}
          accessibilityLabel={`Add ${query.trim()} as a custom subscription`}
          style={[styles.row, { gap: spacing.md }]}
        >
          <Plus size={20} color={colors.primary} />
          <AppText variant="bodyStrong" style={styles.flex}>
            Add “{query.trim()}”
          </AppText>
        </Surface>
      ) : null}
      {isLoading ? (
        <SkeletonList />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {merchants.map((m) => (
            <Surface key={m.slug} onPress={() => onPick(m)} accessibilityLabel={m.name} padded={false} style={[styles.row, { padding: spacing.md, gap: spacing.md }]}>
              <MerchantAvatar name={m.name} color={m.brandColor} size={40} />
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{m.name}</AppText>
                <AppText variant="caption" color="textMuted">
                  {m.category}
                  {m.typicalPrice && m.typicalCurrency ? ` · from ${formatMoney(m.typicalPrice, m.typicalCurrency, { exact: true })}` : ''}
                </AppText>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </Surface>
          ))}
          {merchants.length === 0 && query.trim() ? (
            <AppText variant="body" color="textMuted" align="center">
              Not in our list. Add it as your own above.
            </AppText>
          ) : null}
          {!query.trim() ? null : (
            <AppText variant="caption" color="textMuted" align="center">
              Prices are typical list prices in {home === 'USD' ? 'USD' : 'their original currency'}. You can change them.
            </AppText>
          )}
        </View>
      )}
    </Screen>
  );
}

function SubscriptionForm({
  draft,
  setDraft,
  home,
  editingId,
  onDone,
  onPlanLimit,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  home: string;
  editingId?: string;
  onDone: () => void;
  onPlanLimit: (reason: string) => void;
}) {
  const { spacing } = useTheme();
  const cards = useCards();
  const create = useCreateSubscription();
  const update = useUpdateSubscription(editingId ?? '');
  const [submitted, setSubmitted] = useState(false);
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });

  const price = Number(draft.price.replace(',', '.'));
  const errors = {
    name: draft.name.trim() ? null : 'Give it a name.',
    price: price > 0 ? null : 'Enter the price you pay each time.',
    date: isValidIsoDay(draft.nextRenewal) ? null : 'Use the format YYYY-MM-DD.',
  };
  const valid = !errors.name && !errors.price && !errors.date;
  const currencies = [...new Set([home, 'USD', draft.currency])];
  const today = todayIso();

  const save = () => {
    setSubmitted(true);
    if (!valid) return;
    const input = {
      name: draft.name.trim(),
      priceOriginal: price,
      currency: draft.currency,
      cadence: draft.cadence,
      nextRenewal: draft.nextRenewal,
      cardId: draft.cardId,
      notes: draft.notes.trim() || null,
    };
    const onError = (err: unknown) => {
      if (err instanceof ApiError && err.code === 'PLAN_LIMIT') {
        onPlanLimit(err.message);
        return;
      }
      toast(errorMessage(err), 'error');
    };
    if (editingId) {
      update.mutate(input, {
        onSuccess: () => {
          toast('Saved', 'success');
          onDone();
        },
        onError,
      });
    } else {
      create.mutate(
        { ...input, merchantSlug: draft.merchantSlug },
        {
          onSuccess: ({ rewards }) => {
            onDone();
            celebrateRewards(`${input.name} added`, rewards);
          },
          onError,
        },
      );
    }
  };

  return (
    <Screen
      leading="close"
      title={editingId ? 'Edit subscription' : draft.name || 'New subscription'}
      footer={<Button label={editingId ? 'Save changes' : 'Add subscription'} onPress={save} loading={create.isPending || update.isPending} />}
    >
      {draft.merchantSlug ? (
        <View style={[styles.row, { gap: spacing.md }]}>
          <MerchantAvatar name={draft.name} color={draft.brandColor} />
          <AppText variant="body" color="textMuted" style={styles.flex}>
            Check the price matches your plan. Typical prices vary by country.
          </AppText>
        </View>
      ) : null}

      <Input label="Name" value={draft.name} onChangeText={(name) => set({ name })} error={submitted ? errors.name : null} maxLength={60} />

      <View style={{ gap: spacing.sm }}>
        <Input
          label="Price per charge"
          value={draft.price}
          onChangeText={(p) => set({ price: p.replace(/[^\d.,]/g, '') })}
          keyboardType="decimal-pad"
          placeholder="0.00"
          error={submitted ? errors.price : null}
        />
        <View style={[styles.wrap, { gap: spacing.sm }]}>
          {currencies.map((c) => (
            <Chip key={c} label={c} selected={draft.currency === c} onPress={() => set({ currency: c })} />
          ))}
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <AppText variant="label" color="textMuted">
          Billed
        </AppText>
        <Segmented
          value={draft.cadence}
          onChange={(cadence) => set({ cadence })}
          options={[
            { value: 'WEEKLY', label: 'Weekly' },
            { value: 'MONTHLY', label: 'Monthly' },
            { value: 'QUARTERLY', label: '3 months' },
            { value: 'YEARLY', label: 'Yearly' },
          ]}
        />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Input
          label="Next charge"
          value={draft.nextRenewal}
          onChangeText={(nextRenewal) => set({ nextRenewal })}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
          maxLength={10}
          error={submitted ? errors.date : null}
          helper="We remind you 3 days before."
        />
        <View style={[styles.wrap, { gap: spacing.sm }]}>
          <Chip label="Today" selected={draft.nextRenewal === today} onPress={() => set({ nextRenewal: today })} />
          <Chip label="In a week" selected={draft.nextRenewal === addDays(today, 7)} onPress={() => set({ nextRenewal: addDays(today, 7) })} />
          <Chip label="In a month" selected={draft.nextRenewal === addMonths(today, 1)} onPress={() => set({ nextRenewal: addMonths(today, 1) })} />
        </View>
      </View>

      {cards.data && cards.data.cards.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="textMuted">
            Paid with
          </AppText>
          <View style={[styles.wrap, { gap: spacing.sm }]}>
            <Chip label="Not set" selected={draft.cardId === null} onPress={() => set({ cardId: null })} />
            {cards.data.cards.map((c) => (
              <Chip key={c.id} label={c.last4 ? `${c.nickname} ··${c.last4}` : c.nickname} selected={draft.cardId === c.id} onPress={() => set({ cardId: c.id })} />
            ))}
          </View>
        </View>
      ) : null}

      <Input label="Notes (optional)" value={draft.notes} onChangeText={(notes) => set({ notes })} multiline maxLength={500} placeholder="Shared with family, trial ends…" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
});
