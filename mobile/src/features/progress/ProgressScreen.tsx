import { Award, Flame, Lock, Share2, Target } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { useProgress, useUpdateMe } from '../../api/queries';
import type { Progress } from '../../api/types';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { ProgressBar, ProgressRing } from '../../components/Progress';
import { Screen } from '../../components/Screen';
import { Sheet } from '../../components/Sheet';
import { ErrorState, Skeleton } from '../../components/States';
import { Surface } from '../../components/Surface';
import { formatDay, formatMoney } from '../../lib/format';
import { toast } from '../../store/ui';
import { useTheme } from '../../theme';

export function ProgressScreen() {
  const { data, error, isLoading, refetch, isRefetching } = useProgress();
  return (
    <Screen title="Progress" refreshing={isRefetching} onRefresh={refetch}>
      {isLoading ? (
        <>
          <Skeleton height={260} />
          <Skeleton height={120} />
        </>
      ) : error || !data ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <ProgressContent data={data} />
      )}
    </Screen>
  );
}

function ProgressContent({ data }: { data: Progress }) {
  const { colors, spacing, radius } = useTheme();
  const [goalOpen, setGoalOpen] = useState(false);
  const [badge, setBadge] = useState<Progress['badges'][number] | null>(null);
  const { savings, streak } = data;
  const currency = savings.currency;

  // Without a goal, the ring shows what share of the original spend has been cut.
  const ringTarget = savings.goalMonthly ?? savings.monthly + savings.activeMonthly;
  const ring = ringTarget > 0 ? savings.monthly / ringTarget : 0;
  const levelSpan = data.nextLevelXp ? data.nextLevelXp - data.levelStartXp : 1;
  const earned = data.badges.filter((b) => b.earned).length;

  const share = () =>
    Share.share({
      message:
        savings.monthly > 0
          ? `I cut ${formatMoney(savings.monthly, currency)} a month of subscriptions I wasn’t using, with SubTrack.`
          : 'I’m tracking every subscription on my card with SubTrack.',
    }).catch(() => undefined);

  return (
    <>
      <Surface style={[styles.center, { gap: spacing.lg, paddingVertical: spacing.xl }]}>
        <ProgressRing
          progress={ring}
          accessibilityLabel={savings.goalMonthly ? `Savings goal ${Math.round(ring * 100)} percent reached` : `${Math.round(ring * 100)} percent of spend cut`}
        >
          <AppText variant="overline" color="textMuted">
            SAVING
          </AppText>
          <AppText variant="title" color="success" tabular numberOfLines={1} adjustsFontSizeToFit style={{ maxWidth: 140 }}>
            {formatMoney(savings.monthly, currency)}
          </AppText>
          <AppText variant="caption" color="textMuted">
            a month
          </AppText>
        </ProgressRing>
        <AppText variant="body" color="textMuted" align="center">
          {savings.goalMonthly
            ? `${Math.round(Math.min(ring, 1) * 100)}% of your ${formatMoney(savings.goalMonthly, currency)} goal`
            : savings.monthly > 0
              ? `You cut ${Math.round(ring * 100)}% of your subscription spend.`
              : 'Cancel a subscription you don’t use to start your savings.'}
          {savings.lifetime >= 1 ? `\n${formatMoney(savings.lifetime, currency)} saved so far.` : ''}
        </AppText>
        <View style={[styles.row, { gap: spacing.sm }]}>
          <Button label={savings.goalMonthly ? 'Change goal' : 'Set a goal'} variant="secondary" icon={Target} compact onPress={() => setGoalOpen(true)} />
          <Button label="Share" variant="secondary" icon={Share2} compact onPress={share} />
        </View>
      </Surface>

      <View style={[styles.row, { gap: spacing.md }]}>
        <Surface style={[styles.flex, { gap: spacing.sm }]}>
          <AppText variant="overline" color="textMuted">
            LEVEL {data.level}
          </AppText>
          <AppText variant="bodyStrong">{data.title}</AppText>
          <ProgressBar progress={data.nextLevelXp ? (data.xp - data.levelStartXp) / levelSpan : 1} color="reward" accessibilityLabel="Progress to next level" />
          <AppText variant="caption" color="textMuted" tabular>
            {data.nextLevelXp ? `${data.nextLevelXp - data.xp} XP to level ${data.level + 1}` : `${data.xp} XP`}
          </AppText>
        </Surface>
        <Surface style={[styles.flex, { gap: spacing.sm }]}>
          <AppText variant="overline" color="textMuted">
            STREAK
          </AppText>
          <View style={[styles.row, { gap: spacing.xs }]}>
            <Flame color={streak.months > 0 ? colors.reward : colors.textMuted} size={22} />
            <AppText variant="title" color={streak.months > 0 ? 'reward' : 'textMuted'} tabular>
              {streak.months}
            </AppText>
          </View>
          <AppText variant="caption" color="textMuted">
            {streak.activeThisMonth ? 'months in a row' : streak.months > 0 ? 'Scan this month to keep it' : 'Scan monthly to build it'}
          </AppText>
        </Surface>
      </View>

      <View style={{ gap: spacing.sm }}>
        <View style={[styles.row, styles.between]}>
          <AppText variant="heading">Badges</AppText>
          <AppText variant="label" color="textMuted" tabular>
            {earned} of {data.badges.length}
          </AppText>
        </View>
        <View style={[styles.grid, { gap: spacing.sm }]}>
          {data.badges.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => setBadge(b)}
              accessibilityRole="button"
              accessibilityLabel={`${b.name}, ${b.earned ? 'earned' : 'locked'}`}
              style={[
                styles.badge,
                { backgroundColor: colors.surface, borderColor: b.earned ? colors.reward : colors.border, borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs },
              ]}
            >
              {b.earned ? <Award color={colors.reward} size={28} /> : <Lock color={colors.textMuted} size={24} />}
              <AppText variant="caption" color={b.earned ? 'text' : 'textMuted'} align="center" numberOfLines={2}>
                {b.name}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>

      {data.recent.length ? (
        <View style={{ gap: spacing.sm }}>
          <AppText variant="heading">Recent XP</AppText>
          <Surface padded={false}>
            {data.recent.map((r, i) => (
              <View key={r.id} style={[styles.row, styles.between, { padding: spacing.md, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderTopColor: colors.border }]}>
                <View>
                  <AppText variant="body">{r.label}</AppText>
                  <AppText variant="caption" color="textMuted">
                    {formatDay(r.at)}
                  </AppText>
                </View>
                <AppText variant="bodyStrong" color="reward" tabular>
                  +{r.xp}
                </AppText>
              </View>
            ))}
          </Surface>
        </View>
      ) : null}

      <GoalSheet visible={goalOpen} onClose={() => setGoalOpen(false)} currency={currency} current={savings.goalMonthly} suggestion={savings.activeMonthly * 0.2} />
      <Sheet visible={badge !== null} onClose={() => setBadge(null)} title={badge?.name}>
        <AppText variant="body" color="textMuted">
          {badge?.description}
        </AppText>
        <AppText variant="label" color={badge?.earned ? 'reward' : 'textMuted'}>
          {badge?.earned && badge.earnedAt ? `Earned ${formatDay(badge.earnedAt)}` : 'Not earned yet'}
        </AppText>
      </Sheet>
    </>
  );
}

function GoalSheet({ visible, onClose, currency, current, suggestion }: { visible: boolean; onClose: () => void; currency: string; current: number | null; suggestion: number }) {
  const [value, setValue] = useState(current ? String(current) : suggestion > 0 ? String(Math.round(suggestion)) : '');
  const update = useUpdateMe();
  const amount = Number(value);

  return (
    <Sheet visible={visible} onClose={onClose} title="Monthly savings goal">
      <AppText variant="body" color="textMuted">
        How much do you want to cut from subscriptions each month? Most people start with 20% of what they spend.
      </AppText>
      <Input label={`Goal in ${currency}`} value={value} onChangeText={(t) => setValue(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" autoFocus />
      <Button
        label="Save goal"
        disabled={!(amount > 0)}
        loading={update.isPending}
        onPress={() =>
          update.mutate({ savingsGoalMonthly: amount }, { onSuccess: onClose, onError: (e) => toast(errorMessage(e), 'error') })
        }
      />
      {current ? (
        <Button label="Remove goal" variant="ghost" onPress={() => update.mutate({ savingsGoalMonthly: null }, { onSuccess: onClose })} />
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  badge: { width: '31.5%', alignItems: 'center', justifyContent: 'center', borderWidth: 1, minHeight: 104 },
});
