import { StyleSheet, View } from 'react-native';
import type { Subscription } from '../../api/types';
import { AppText } from '../../components/AppText';
import { MerchantAvatar } from '../../components/MerchantAvatar';
import { PressableScale } from '../../components/Pressable';
import { Toggle } from '../../components/Toggle';
import { CADENCE_LABEL, formatDay, formatMoney } from '../../lib/format';
import { useTheme } from '../../theme';

type Props = {
  subscription: Subscription;
  currency: string;
  onPress: () => void;
  onToggle: (active: boolean) => void;
};

export function SubscriptionRow({
  subscription: s,
  currency,
  onPress,
  onToggle,
}: Props) {
  const { colors, radius, spacing } = useTheme();
  const active = s.status === 'ACTIVE';
  const meta = active
    ? s.trialEndsAt
      ? `Free trial · ends ${formatDay(s.trialEndsAt)}`
      : s.nextRenewal
      ? `${CADENCE_LABEL[s.cadence]} · renews ${formatDay(s.nextRenewal)}`
      : CADENCE_LABEL[s.cadence]
    : s.verifiedAt
    ? 'Cancelled · confirmed by statement'
    : 'Cancelled';

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={`${s.name}, ${formatMoney(
        s.cost.monthly,
        currency,
      )} a month, ${meta}`}
      accessibilityHint="Opens details"
      style={[
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.lg,
          padding: spacing.md,
          gap: spacing.md,
        },
      ]}
    >
      <MerchantAvatar name={s.name} color={s.brandColor} muted={!active} />
      <View style={styles.flex}>
        <AppText
          variant="bodyStrong"
          numberOfLines={1}
          color={active ? 'text' : 'textMuted'}
        >
          {s.name}
        </AppText>
        <AppText
          variant="caption"
          color={
            s.trialEndsAt
              ? 'reward'
              : s.verifiedAt && !active
              ? 'success'
              : 'textMuted'
          }
          numberOfLines={1}
        >
          {meta}
        </AppText>
      </View>
      <View style={styles.right}>
        <AppText
          variant="bodyStrong"
          tabular
          color={active ? 'text' : 'textMuted'}
          style={!active && styles.struck}
        >
          {formatMoney(s.cost.monthly, currency)}
        </AppText>
        <AppText variant="caption" color="textMuted">
          {s.cost.basis === 'actual' ? 'per month' : 'est. per month'}
        </AppText>
      </View>
      <Toggle
        value={active}
        onChange={onToggle}
        accessibilityLabel={`${s.name} active`}
      />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  flex: { flex: 1 },
  right: { alignItems: 'flex-end' },
  struck: { textDecorationLine: 'line-through' },
});
