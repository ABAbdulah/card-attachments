import { CircleCheck, ExternalLink, Pencil, Trash2 } from 'lucide-react-native';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { useDeleteSubscription, useMe, useSubscription } from '../../api/queries';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { MerchantAvatar } from '../../components/MerchantAvatar';
import { HeaderButton, Screen } from '../../components/Screen';
import { ErrorState, Skeleton } from '../../components/States';
import { Surface } from '../../components/Surface';
import { Toggle } from '../../components/Toggle';
import { CADENCE_LABEL, formatDay, formatMoney, relativeDay } from '../../lib/format';
import type { AppScreenProps } from '../../navigation/types';
import { toast } from '../../store/ui';
import { useTheme } from '../../theme';
import { useToggleSubscription } from './useToggleSubscription';

export function SubscriptionDetailScreen({ route, navigation }: AppScreenProps<'SubscriptionDetail'>) {
  const { id } = route.params;
  const { colors, spacing } = useTheme();
  const { data, error, isLoading, refetch } = useSubscription(id);
  const me = useMe();
  const currency = me.data?.user.homeCurrency ?? 'PKR';
  const { toggle, sheet } = useToggleSubscription(currency);
  const remove = useDeleteSubscription();

  if (isLoading) {
    return (
      <Screen leading="back">
        <Skeleton height={120} />
        <Skeleton height={200} />
      </Screen>
    );
  }
  if (error || !data) {
    return (
      <Screen leading="back">
        <ErrorState error={error} onRetry={refetch} />
      </Screen>
    );
  }

  const s = data.subscription;
  const active = s.status === 'ACTIVE';
  const foreign = s.currency !== currency;

  const confirmDelete = () =>
    Alert.alert('Remove from SubTrack?', `This deletes ${s.name} from your list. It does not cancel it with ${s.name}.`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () =>
          remove.mutate(s.id, {
            onSuccess: () => navigation.goBack(),
            onError: (e) => toast(errorMessage(e), 'error'),
          }),
      },
    ]);

  return (
    <Screen leading="back" actions={<HeaderButton icon={Pencil} label="Edit" onPress={() => navigation.navigate('AddSubscription', { subscriptionId: s.id })} />}>
      <View style={[styles.row, { gap: spacing.md }]}>
        <MerchantAvatar name={s.name} color={s.brandColor} size={60} muted={!active} />
        <View style={styles.flex}>
          <AppText variant="title" accessibilityRole="header" numberOfLines={2}>
            {s.name}
          </AppText>
          <View style={[styles.row, { gap: spacing.xs, flexWrap: 'wrap', marginTop: spacing.xs }]}>
            <Chip label={active ? 'Active' : 'Cancelled'} tone={active ? 'success' : 'textMuted'} />
            {s.verifiedAt ? <Chip label="Verified" icon={CircleCheck} tone="success" /> : null}
            {s.category ? <Chip label={s.category} /> : null}
          </View>
        </View>
        <Toggle value={active} onChange={(on) => toggle(s, on)} accessibilityLabel={`${s.name} active`} />
      </View>

      <Surface style={{ gap: spacing.xs }}>
        <AppText variant="overline" color="textMuted">
          {s.cost.basis === 'actual' ? 'WHAT YOUR BANK CHARGES' : 'ESTIMATED COST'}
        </AppText>
        <AppText variant="display" tabular>
          {formatMoney(s.cost.perCharge, currency)}
          <AppText variant="heading" color="textMuted">
            {' '}
            {CADENCE_LABEL[s.cadence].toLowerCase()}
          </AppText>
        </AppText>
        {foreign ? (
          <AppText variant="caption" color="textMuted">
            Listed price {formatMoney(s.priceOriginal, s.currency, { exact: true })}
            {s.cost.basis === 'actual' ? '. The difference is the exchange rate and your bank’s fees.' : ', converted at today’s rate. Bank fees are extra.'}
          </AppText>
        ) : null}
        <AppText variant="label" color="textMuted" tabular style={{ marginTop: spacing.xs }}>
          {formatMoney(s.cost.monthly, currency)} a month · {formatMoney(s.cost.yearly, currency)} a year
        </AppText>
      </Surface>

      <Surface padded={false}>
        <InfoRow label="Next renewal" value={s.nextRenewal ? `${formatDay(s.nextRenewal)} (${relativeDay(s.nextRenewal).toLowerCase()})` : active ? 'Unknown' : 'None, cancelled'} first />
        <InfoRow label="Billing" value={CADENCE_LABEL[s.cadence]} />
        <InfoRow label="Card" value={s.card?.nickname ?? 'Not set'} />
        <InfoRow label="Added" value={s.source === 'DETECTED' ? 'Found in your statement' : 'Added by you'} />
        {s.cancelledAt ? <InfoRow label="Cancelled on" value={formatDay(s.cancelledAt)} /> : null}
        {s.notes ? <InfoRow label="Notes" value={s.notes} /> : null}
      </Surface>

      <View style={{ gap: spacing.sm }}>
        <AppText variant="heading">How to cancel</AppText>
        <Surface style={{ gap: spacing.md }}>
          {data.cancelGuide.steps.map((step, i) => (
            <View key={i} style={[styles.row, { gap: spacing.md, alignItems: 'flex-start' }]}>
              <View style={[styles.stepNo, { backgroundColor: colors.surfaceRaised }]}>
                <AppText variant="label" tabular>
                  {i + 1}
                </AppText>
              </View>
              <AppText variant="body" style={styles.flex}>
                {step}
              </AppText>
            </View>
          ))}
          {data.cancelGuide.manageUrl ? (
            <Button
              label={`Open ${s.name} billing`}
              variant="secondary"
              icon={ExternalLink}
              onPress={() => Linking.openURL(data.cancelGuide.manageUrl!).catch(() => toast('Could not open the link.', 'error'))}
            />
          ) : null}
        </Surface>
      </View>

      <View style={{ gap: spacing.sm }}>
        <AppText variant="heading">Charge history</AppText>
        {data.charges.length === 0 ? (
          <AppText variant="body" color="textMuted">
            No charges from a statement yet. Scan one to see what you really paid.
          </AppText>
        ) : (
          <>
            <AppText variant="body" color="textMuted">
              {formatMoney(data.totalPaid, data.charges[0]!.currency)} paid across {data.charges.length} {data.charges.length === 1 ? 'charge' : 'charges'}.
            </AppText>
            <Surface padded={false}>
              {data.charges.map((c, i) => (
                <View key={c.id} style={[styles.row, styles.between, { padding: spacing.md, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderTopColor: colors.border }]}>
                  <View>
                    <AppText variant="bodyStrong">{formatDay(c.date)}</AppText>
                    <AppText variant="caption" color="textMuted">
                      {c.card}
                    </AppText>
                  </View>
                  <View style={styles.right}>
                    <AppText variant="bodyStrong" tabular>
                      {formatMoney(c.amountLocal, c.currency, { exact: true })}
                    </AppText>
                    {c.amountOriginal && c.originalCurrency ? (
                      <AppText variant="caption" color="textMuted" tabular>
                        {formatMoney(c.amountOriginal, c.originalCurrency, { exact: true })}
                      </AppText>
                    ) : null}
                  </View>
                </View>
              ))}
            </Surface>
          </>
        )}
      </View>

      <Button label="Remove from SubTrack" variant="danger" icon={Trash2} onPress={confirmDelete} loading={remove.isPending} />
      {sheet}
    </Screen>
  );
}

function InfoRow({ label, value, first }: { label: string; value: string; first?: boolean }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.row, styles.between, { padding: spacing.md, gap: spacing.lg, borderTopWidth: first ? 0 : StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
      <AppText variant="body" color="textMuted">
        {label}
      </AppText>
      <AppText variant="bodyStrong" style={styles.value} numberOfLines={2}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { justifyContent: 'space-between' },
  right: { alignItems: 'flex-end' },
  value: { flexShrink: 1, textAlign: 'right' },
  stepNo: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
