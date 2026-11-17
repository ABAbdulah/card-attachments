import { useNavigation } from '@react-navigation/native';
import { Plus, Repeat, ScanLine } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSubscriptions } from '../../api/queries';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { MoneyCounter } from '../../components/MoneyCounter';
import { HeaderButton, Screen } from '../../components/Screen';
import { Segmented } from '../../components/Segmented';
import { EmptyState, ErrorState, SkeletonList } from '../../components/States';
import { syncReminders } from '../../lib/reminders';
import { useTheme } from '../../theme';
import { SubscriptionRow } from './SubscriptionRow';
import { useToggleSubscription } from './useToggleSubscription';

export function SubscriptionsScreen() {
  const navigation = useNavigation();
  const { spacing } = useTheme();
  const [tab, setTab] = useState<'ACTIVE' | 'CANCELLED'>('ACTIVE');
  const { data, error, isLoading, refetch, isRefetching } = useSubscriptions();
  const currency = data?.currency ?? 'PKR';
  const { toggle, sheet } = useToggleSubscription(currency);

  const { active, cancelled, monthly, saved } = useMemo(() => {
    const subs = data?.subscriptions ?? [];
    const a = subs.filter(s => s.status === 'ACTIVE');
    const c = subs.filter(s => s.status === 'CANCELLED');
    return {
      active: a,
      cancelled: c,
      monthly: a.reduce((sum, s) => sum + s.cost.monthly, 0),
      saved: c.reduce((sum, s) => sum + s.cost.monthly, 0),
    };
  }, [data]);

  // Keep on-device renewal reminders in step with the list.
  useEffect(() => {
    if (data) syncReminders(data.subscriptions, data.currency);
  }, [data]);

  const shown = tab === 'ACTIVE' ? active : cancelled;

  return (
    <Screen
      title="Subscriptions"
      actions={
        <HeaderButton
          icon={Plus}
          label="Add a subscription"
          onPress={() => navigation.navigate('AddSubscription')}
        />
      }
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'ACTIVE', label: `Active (${active.length})` },
          { value: 'CANCELLED', label: `Cancelled (${cancelled.length})` },
        ]}
      />

      {isLoading ? (
        <SkeletonList />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <>
          <View style={{ gap: spacing.xs }}>
            <AppText variant="overline" color="textMuted">
              {tab === 'ACTIVE'
                ? 'YOU PAY EVERY MONTH'
                : 'YOU SAVE EVERY MONTH'}
            </AppText>
            <MoneyCounter
              value={tab === 'ACTIVE' ? monthly : saved}
              currency={currency}
              variant="title"
              color={tab === 'ACTIVE' ? 'text' : 'success'}
            />
          </View>

          {shown.length === 0 ? (
            tab === 'ACTIVE' ? (
              <EmptyState
                icon={Repeat}
                title="No active subscriptions"
                body="Scan a statement to find them, or add one yourself."
                action={
                  <View style={{ gap: spacing.sm }}>
                    <Button
                      label="Scan a statement"
                      icon={ScanLine}
                      onPress={() => navigation.navigate('Import')}
                    />
                    <Button
                      label="Add manually"
                      variant="secondary"
                      icon={Plus}
                      onPress={() => navigation.navigate('AddSubscription')}
                    />
                  </View>
                }
              />
            ) : (
              <EmptyState
                icon={Repeat}
                title="Nothing cancelled yet"
                body="Switch off a subscription you no longer use and the savings show up here."
              />
            )
          ) : (
            <View style={{ gap: spacing.sm }}>
              {shown.map(s => (
                <SubscriptionRow
                  key={s.id}
                  subscription={s}
                  currency={currency}
                  onPress={() =>
                    navigation.navigate('SubscriptionDetail', { id: s.id })
                  }
                  onToggle={on => toggle(s, on)}
                />
              ))}
              <AppText
                variant="caption"
                color="textMuted"
                align="center"
                style={{ marginTop: spacing.sm }}
              >
                “est.” means converted at today’s market rate. Amounts from your
                statement include bank fees.
              </AppText>
            </View>
          )}
        </>
      )}
      {sheet}
    </Screen>
  );
}
