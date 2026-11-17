import {
  BellOff,
  CircleAlert,
  CircleCheck,
  TrendingUp,
} from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAlerts, useMarkAlertsRead } from '../../api/queries';
import type { AppAlert } from '../../api/types';
import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { EmptyState, ErrorState, SkeletonList } from '../../components/States';
import { Surface } from '../../components/Surface';
import { formatDay } from '../../lib/format';
import type { AppScreenProps } from '../../navigation/types';
import { useTheme } from '../../theme';

const ICONS: Record<
  AppAlert['type'],
  { icon: typeof CircleAlert; tone: 'danger' | 'reward' | 'success' }
> = {
  STILL_CHARGING: { icon: CircleAlert, tone: 'danger' },
  PRICE_INCREASE: { icon: TrendingUp, tone: 'reward' },
  VERIFIED_CANCEL: { icon: CircleCheck, tone: 'success' },
};

export function AlertsScreen({ navigation }: AppScreenProps<'Alerts'>) {
  const { colors, spacing } = useTheme();
  const { data, error, isLoading, refetch } = useAlerts();
  const markRead = useMarkAlertsRead();
  const hasUnread = data?.alerts.some(a => !a.read);

  useEffect(() => {
    if (hasUnread) markRead.mutate();
    // Mark as read once, when unread alerts are first shown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnread]);

  return (
    <Screen
      leading="back"
      title="Alerts"
      subtitle="What your latest statements told us."
    >
      {isLoading ? (
        <SkeletonList />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !data?.alerts.length ? (
        <EmptyState
          icon={BellOff}
          title="No alerts"
          body="We’ll tell you here if a cancelled subscription charges again, a price goes up, or a cancellation is confirmed."
        />
      ) : (
        data.alerts.map(a => {
          const { icon: Icon, tone } = ICONS[a.type];
          return (
            <Surface
              key={a.id}
              onPress={
                a.subscriptionId
                  ? () =>
                      navigation.navigate('SubscriptionDetail', {
                        id: a.subscriptionId!,
                      })
                  : undefined
              }
              accessibilityLabel={`${a.title}. ${a.body}`}
              style={[
                styles.row,
                {
                  gap: spacing.md,
                  borderColor: a.read ? colors.border : colors[tone],
                },
              ]}
            >
              <Icon color={colors[tone]} size={22} />
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{a.title}</AppText>
                <AppText variant="body" color="textMuted">
                  {a.body}
                </AppText>
                <AppText
                  variant="caption"
                  color="textMuted"
                  style={{ marginTop: spacing.xs }}
                >
                  {formatDay(a.createdAt)}
                </AppText>
              </View>
            </Surface>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
});
