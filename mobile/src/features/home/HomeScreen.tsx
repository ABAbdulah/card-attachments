import { useNavigation } from '@react-navigation/native';
import { Bell, ChevronRight, Flame, Plus, ScanLine, Settings, Sparkles, TrendingDown } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useDashboard } from '../../api/queries';
import type { Dashboard } from '../../api/types';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { MerchantAvatar } from '../../components/MerchantAvatar';
import { MoneyCounter } from '../../components/MoneyCounter';
import { ProgressBar } from '../../components/Progress';
import { HeaderButton, Screen } from '../../components/Screen';
import { EmptyState, ErrorState, Skeleton } from '../../components/States';
import { Surface } from '../../components/Surface';
import { formatMoney, relativeDay } from '../../lib/format';
import { useTheme } from '../../theme';

const CATEGORY_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#A78BFA', '#F472B6', '#64748B'];

export function HomeScreen() {
  const navigation = useNavigation();
  const { data, error, isLoading, refetch, isRefetching } = useDashboard();

  return (
    <Screen
      title="Your subscriptions"
      actions={
        <>
          <HeaderButton icon={Bell} label={data?.unreadAlerts ? `Alerts, ${data.unreadAlerts} unread` : 'Alerts'} badge={!!data?.unreadAlerts} onPress={() => navigation.navigate('Alerts')} />
          <HeaderButton icon={Settings} label="Settings" onPress={() => navigation.navigate('Settings')} />
        </>
      }
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      {isLoading ? <HomeSkeleton /> : error ? <ErrorState error={error} onRetry={refetch} /> : data ? <HomeContent data={data} /> : null}
    </Screen>
  );
}

function HomeContent({ data }: { data: Dashboard }) {
  const navigation = useNavigation();
  const { colors, spacing, radius } = useTheme();
  const empty = data.activeCount === 0 && data.cancelledCount === 0;

  if (empty && data.pendingCandidates === 0) {
    return (
      <EmptyState
        icon={ScanLine}
        title="Let’s find your subscriptions"
        body="Upload a bank statement and we’ll list everything that charges your card, or add them yourself."
        action={
          <View style={{ gap: spacing.sm }}>
            <Button label="Scan a statement" icon={ScanLine} onPress={() => navigation.navigate('Import')} />
            <Button label="Add one manually" variant="secondary" icon={Plus} onPress={() => navigation.navigate('AddSubscription')} />
          </View>
        }
      />
    );
  }

  const { progress } = data;
  const levelSpan = progress.nextLevelXp ? progress.nextLevelXp - progress.levelStartXp : 1;
  const levelProgress = progress.nextLevelXp ? (progress.xp - progress.levelStartXp) / levelSpan : 1;
  const categoryTotal = data.categories.reduce((sum, c) => sum + c.monthly, 0);

  return (
    <>
      <Surface style={{ gap: spacing.sm }}>
        <AppText variant="overline" color="textMuted">
          DUE THIS MONTH
        </AppText>
        <MoneyCounter value={data.dueThisMonth} currency={data.currency} />
        <AppText variant="caption" color="textMuted">
          {formatMoney(data.paidThisMonth, data.currency)} paid · {formatMoney(data.remainingThisMonth, data.currency)} still to come
        </AppText>
        <View style={[styles.split, { borderTopColor: colors.border, paddingTop: spacing.md, marginTop: spacing.xs }]}>
          <Stat label="Monthly average" value={formatMoney(data.monthlyAverage, data.currency)} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Stat label="Per year" value={formatMoney(data.yearlyTotal, data.currency)} />
        </View>
      </Surface>

      {data.pendingCandidates > 0 ? (
        <Surface onPress={() => navigation.navigate('Review')} raised accessibilityLabel={`${data.pendingCandidates} suggestions to review`} style={[styles.row, { gap: spacing.md, borderColor: colors.primary }]}>
          <Sparkles color={colors.primary} size={22} />
          <View style={styles.flex}>
            <AppText variant="bodyStrong">
              {data.pendingCandidates} {data.pendingCandidates === 1 ? 'suggestion' : 'suggestions'} to review
            </AppText>
            <AppText variant="caption" color="textMuted">
              Found in your statement. Confirm the ones you pay for.
            </AppText>
          </View>
          <ChevronRight color={colors.textMuted} size={20} />
        </Surface>
      ) : null}

      <Surface
        onPress={() => navigation.navigate('Tabs', { screen: 'Progress' })}
        accessibilityLabel={`Level ${progress.level}, ${progress.title}. ${progress.streak.months} month streak.`}
        style={{ gap: spacing.md }}
      >
        <View style={[styles.row, { gap: spacing.md }]}>
          <View style={[styles.levelBadge, { backgroundColor: `${colors.reward}26`, borderRadius: radius.md }]}>
            <AppText variant="bodyStrong" color="reward" tabular>
              {progress.level}
            </AppText>
          </View>
          <View style={styles.flex}>
            <AppText variant="bodyStrong">{progress.title}</AppText>
            <AppText variant="caption" color="textMuted" tabular>
              {progress.nextLevelXp ? `${progress.xp} / ${progress.nextLevelXp} XP` : `${progress.xp} XP · top level`}
            </AppText>
          </View>
          <View style={[styles.row, { gap: spacing.xs }]}>
            <Flame color={progress.streak.months > 0 ? colors.reward : colors.textMuted} size={18} />
            <AppText variant="label" color={progress.streak.months > 0 ? 'reward' : 'textMuted'} tabular>
              {progress.streak.months}
            </AppText>
          </View>
        </View>
        <ProgressBar progress={levelProgress} color="reward" height={6} accessibilityLabel="Progress to next level" />
      </Surface>

      {data.savedMonthly > 0 ? (
        <Surface style={[styles.row, { gap: spacing.md }]}>
          <TrendingDown color={colors.success} size={22} />
          <View style={styles.flex}>
            <AppText variant="bodyStrong" color="success">
              Saving {formatMoney(data.savedMonthly, data.currency)} a month
            </AppText>
            <AppText variant="caption" color="textMuted">
              From {data.cancelledCount} cancelled {data.cancelledCount === 1 ? 'subscription' : 'subscriptions'}.
            </AppText>
          </View>
        </Surface>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        <AppText variant="heading">Coming up</AppText>
        {data.upcoming.length === 0 ? (
          <AppText variant="body" color="textMuted">
            Nothing renews in the next 30 days.
          </AppText>
        ) : (
          <Surface padded={false}>
            {data.upcoming.map((item, i) => (
              <View
                key={item.id + item.date}
                style={[styles.row, { padding: spacing.md, gap: spacing.md, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderTopColor: colors.border }]}
              >
                <MerchantAvatar name={item.name} color={item.brandColor} size={36} />
                <View style={styles.flex}>
                  <AppText variant="bodyStrong" numberOfLines={1}>
                    {item.name}
                  </AppText>
                  <AppText variant="caption" color="textMuted">
                    {relativeDay(item.date)}
                  </AppText>
                </View>
                <AppText variant="bodyStrong" tabular>
                  {formatMoney(item.amount, data.currency)}
                </AppText>
              </View>
            ))}
          </Surface>
        )}
      </View>

      {data.categories.length > 1 ? (
        <View style={{ gap: spacing.sm }}>
          <AppText variant="heading">Where it goes</AppText>
          <Surface style={{ gap: spacing.md }}>
            <View style={[styles.bar, { borderRadius: radius.full }]} accessibilityLabel="Monthly spend by category">
              {data.categories.slice(0, 6).map((c, i) => (
                <View key={c.name} style={{ flex: c.monthly / categoryTotal, backgroundColor: CATEGORY_COLORS[i] }} />
              ))}
            </View>
            {data.categories.slice(0, 6).map((c, i) => (
              <View key={c.name} style={[styles.row, { gap: spacing.sm }]}>
                <View style={[styles.dot, { backgroundColor: CATEGORY_COLORS[i] }]} />
                <AppText variant="label" style={styles.flex}>
                  {c.name}
                </AppText>
                <AppText variant="label" color="textMuted" tabular>
                  {formatMoney(c.monthly, data.currency)}/mo
                </AppText>
              </View>
            ))}
          </Surface>
        </View>
      ) : null}

      <Button label="Scan a statement" icon={ScanLine} onPress={() => navigation.navigate('Import')} />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.flex}>
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
      <AppText variant="bodyStrong" tabular>
        {value}
      </AppText>
    </View>
  );
}

function HomeSkeleton() {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.lg }} accessibilityLabel="Loading">
      <Skeleton height={170} />
      <Skeleton height={84} />
      <Skeleton height={220} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  split: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, gap: 16 },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  levelBadge: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  bar: { flexDirection: 'row', height: 12, overflow: 'hidden' },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
