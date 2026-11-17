import {
  Bell,
  CircleCheck,
  CreditCard,
  Infinity as InfinityIcon,
  ScanLine,
  ShieldCheck,
} from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { useBillingConfig, useDevPlan } from '../../api/queries';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { PressableScale } from '../../components/Pressable';
import { Screen } from '../../components/Screen';
import { Surface } from '../../components/Surface';
import type { AppScreenProps } from '../../navigation/types';
import { celebrateRewards, toast } from '../../store/ui';
import { useTheme } from '../../theme';

const BENEFITS = [
  { icon: ScanLine, text: 'Unlimited statement scans, every card and bank' },
  { icon: InfinityIcon, text: 'Track as many subscriptions as you have' },
  {
    icon: ShieldCheck,
    text: 'Proof your cancellations worked, statement by statement',
  },
  { icon: Bell, text: 'Price-increase and still-charging alerts' },
  { icon: CreditCard, text: 'The full list of merchants holding your card' },
];

type PlanId = 'lifetime' | 'yearly';

export function PaywallScreen({
  route,
  navigation,
}: AppScreenProps<'Paywall'>) {
  const { colors, spacing, radius } = useTheme();
  const config = useBillingConfig();
  const devPlan = useDevPlan();
  const [plan, setPlan] = useState<PlanId>('lifetime');

  const purchasesEnabled = config.data?.purchasesEnabled ?? false;
  const devSwitch = config.data?.devPlanSwitch ?? false;

  return (
    <Screen
      leading="close"
      title="CardSweep Pro"
      subtitle={
        route.params?.reason ??
        'Find every subscription and keep your card clean.'
      }
      footer={
        purchasesEnabled ? (
          <Button
            label="Continue"
            onPress={() =>
              toast('Purchases are handled by the app store.', 'info')
            }
          />
        ) : devSwitch ? (
          <Button
            label="Activate Pro (test account)"
            loading={devPlan.isPending}
            onPress={() =>
              devPlan.mutate('PRO', {
                onSuccess: () => {
                  navigation.goBack();
                  celebrateRewards('Pro is on', null);
                },
                onError: e => toast(errorMessage(e), 'error'),
              })
            }
          />
        ) : (
          <Button label="Purchases open soon" disabled />
        )
      }
    >
      <Surface style={{ gap: spacing.md }}>
        {BENEFITS.map(({ icon: Icon, text }) => (
          <View key={text} style={[styles.row, { gap: spacing.md }]}>
            <Icon color={colors.reward} size={20} />
            <AppText variant="body" style={styles.flex}>
              {text}
            </AppText>
          </View>
        ))}
      </Surface>

      <View style={{ gap: spacing.sm }} accessibilityRole="radiogroup">
        <PlanCard
          selected={plan === 'lifetime'}
          onPress={() => setPlan('lifetime')}
          title="Lifetime"
          caption="Pay once. No subscription to track."
          tag="Best for a subscription tracker"
          radius={radius.lg}
        />
        <PlanCard
          selected={plan === 'yearly'}
          onPress={() => setPlan('yearly')}
          title="Yearly"
          caption="Renews once a year. Cancel any time."
          radius={radius.lg}
        />
      </View>
      <AppText variant="caption" color="textMuted" align="center">
        Prices are shown by the App Store or Google Play at checkout, in your
        currency.
      </AppText>
    </Screen>
  );
}

function PlanCard({
  selected,
  onPress,
  title,
  caption,
  tag,
  radius,
}: {
  selected: boolean;
  onPress: () => void;
  title: string;
  caption: string;
  tag?: string;
  radius: number;
}) {
  const { colors, spacing } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title}. ${caption}`}
      style={[
        styles.row,
        {
          gap: spacing.md,
          padding: spacing.lg,
          borderRadius: radius,
          borderWidth: 1.5,
          borderColor: selected ? colors.reward : colors.border,
          backgroundColor: colors.surface,
        },
      ]}
    >
      <CircleCheck color={selected ? colors.reward : colors.border} size={22} />
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="caption" color="textMuted">
          {caption}
        </AppText>
        {tag ? (
          <AppText
            variant="overline"
            color="reward"
            style={{ marginTop: spacing.xs }}
          >
            {tag.toUpperCase()}
          </AppText>
        ) : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
});
