import { useNavigation } from '@react-navigation/native';
import { CreditCard, ExternalLink, FileText, ScanLine, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { useCards, useDeleteStatement, useExposure, useStatements } from '../../api/queries';
import type { ExposureMerchant } from '../../api/types';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { MerchantAvatar } from '../../components/MerchantAvatar';
import { PressableScale } from '../../components/Pressable';
import { Screen } from '../../components/Screen';
import { Segmented } from '../../components/Segmented';
import { EmptyState, ErrorState, SkeletonList } from '../../components/States';
import { Surface } from '../../components/Surface';
import { formatDay, formatMoney } from '../../lib/format';
import { toast } from '../../store/ui';
import { useTheme } from '../../theme';

type Filter = 'all' | 'recurring' | 'oneoff';

export function CardsScreen() {
  const navigation = useNavigation();
  const { colors, spacing } = useTheme();
  const exposure = useExposure();
  const cards = useCards();
  const statements = useStatements();
  const removeStatement = useDeleteStatement();
  const [filter, setFilter] = useState<Filter>('all');

  const merchants = useMemo(() => {
    const all = exposure.data?.merchants ?? [];
    const recurring = (m: ExposureMerchant) => m.subscriptionId !== null || (m.billing !== null && m.billing !== 'PURCHASE');
    const filtered = filter === 'all' ? all : all.filter((m) => (filter === 'recurring' ? recurring(m) : !recurring(m)));
    return [...filtered].sort((a, b) => b.lastCharge.localeCompare(a.lastCharge));
  }, [exposure.data, filter]);

  const refresh = () => {
    exposure.refetch();
    cards.refetch();
    statements.refetch();
  };

  const confirmRemove = (id: string, label: string) =>
    Alert.alert('Remove this statement?', `Card payments from ${label} are deleted. Subscriptions you confirmed stay on your list.`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeStatement.mutate(id, { onError: (e) => toast(errorMessage(e), 'error') }) },
    ]);

  const total = exposure.data?.merchants.length ?? 0;

  return (
    <Screen title="Where your card is saved" subtitle="Every merchant that has charged your card." refreshing={exposure.isRefetching} onRefresh={refresh}>
      {cards.data && cards.data.cards.length > 0 ? (
        <View style={[styles.wrap, { gap: spacing.sm }]}>
          {cards.data.cards.map((c) => (
            <Chip
              key={c.id}
              icon={CreditCard}
              label={`${c.nickname}${c.coveredUntil ? ` · to ${formatDay(c.coveredUntil)}` : ''}`}
            />
          ))}
        </View>
      ) : null}

      {exposure.isLoading ? (
        <SkeletonList rows={6} />
      ) : exposure.error ? (
        <ErrorState error={exposure.error} onRetry={refresh} />
      ) : total === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No card payments yet"
          body="Scan a statement to see every shop and service that has your card, including the ones you forgot."
          action={<Button label="Scan a statement" icon={ScanLine} onPress={() => navigation.navigate('Import')} />}
        />
      ) : (
        <>
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: `All (${total})` },
              { value: 'recurring', label: 'Recurring' },
              { value: 'oneoff', label: 'One-off' },
            ]}
          />
          <AppText variant="caption" color="textMuted">
            Remove your saved card from services you no longer use, so they can’t charge it again.
          </AppText>
          <View style={{ gap: spacing.sm }}>
            {merchants.map((m) => (
              <MerchantRow key={m.key} merchant={m} currency={exposure.data!.currency} onOpenSubscription={(id) => navigation.navigate('SubscriptionDetail', { id })} />
            ))}
          </View>
        </>
      )}

      {statements.data && statements.data.statements.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <AppText variant="heading">Statements scanned</AppText>
          <Surface padded={false}>
            {statements.data.statements.map((s, i) => (
              <View key={s.id} style={[styles.row, { padding: spacing.md, gap: spacing.md, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderTopColor: colors.border }]}>
                <FileText size={20} color={colors.textMuted} />
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">{s.bank}</AppText>
                  <AppText variant="caption" color="textMuted">
                    {formatDay(s.periodStart)} – {formatDay(s.periodEnd)} · {s.charges} payments
                  </AppText>
                </View>
                <PressableScale onPress={() => confirmRemove(s.id, s.bank)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remove ${s.bank} statement`}>
                  <Trash2 size={18} color={colors.textMuted} />
                </PressableScale>
              </View>
            ))}
          </Surface>
        </View>
      ) : null}
    </Screen>
  );
}

function MerchantRow({ merchant: m, currency, onOpenSubscription }: { merchant: ExposureMerchant; currency: string; onOpenSubscription: (id: string) => void }) {
  const { colors, spacing } = useTheme();
  const tag =
    m.subscriptionStatus === 'ACTIVE' ? (
      <Chip label="Tracked" tone="success" />
    ) : m.subscriptionStatus === 'CANCELLED' ? (
      <Chip label="Cancelled" tone="textMuted" />
    ) : m.billing && m.billing !== 'PURCHASE' ? (
      <Chip label="Subscription service" tone="reward" />
    ) : null;

  const onPress = m.subscriptionId
    ? () => onOpenSubscription(m.subscriptionId!)
    : m.manageUrl
      ? () => Linking.openURL(m.manageUrl!).catch(() => toast('Could not open the link.', 'error'))
      : undefined;

  return (
    <Surface onPress={onPress} padded={false} accessibilityLabel={`${m.name}, ${m.chargeCount} charges, last ${formatDay(m.lastCharge)}`} style={[styles.row, { padding: spacing.md, gap: spacing.md }]}>
      <MerchantAvatar name={m.name} color={m.brandColor} size={40} />
      <View style={[styles.flex, { gap: 2 }]}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {m.name}
        </AppText>
        <AppText variant="caption" color="textMuted">
          {m.chargeCount} {m.chargeCount === 1 ? 'charge' : 'charges'} · last {formatDay(m.lastCharge)}
        </AppText>
        {tag}
      </View>
      <View style={styles.right}>
        <AppText variant="bodyStrong" tabular>
          {formatMoney(m.total, currency)}
        </AppText>
        <AppText variant="caption" color="textMuted">
          total
        </AppText>
      </View>
      {!m.subscriptionId && m.manageUrl ? <ExternalLink size={16} color={colors.textMuted} /> : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  right: { alignItems: 'flex-end' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
});
