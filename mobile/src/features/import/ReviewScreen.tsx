import { Check, PartyPopper, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { useCandidates, useReviewCandidates } from '../../api/queries';
import type { Candidate, Confidence } from '../../api/types';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { MerchantAvatar } from '../../components/MerchantAvatar';
import { PressableScale } from '../../components/Pressable';
import { Screen } from '../../components/Screen';
import { EmptyState, ErrorState, SkeletonList } from '../../components/States';
import { Surface } from '../../components/Surface';
import { CADENCE_LABEL, formatDay, formatMoney } from '../../lib/format';
import { haptics } from '../../lib/haptics';
import type { AppScreenProps } from '../../navigation/types';
import { celebrateRewards, toast } from '../../store/ui';
import { useTheme } from '../../theme';

const GROUPS: { confidence: Confidence; title: string; body: string }[] = [
  {
    confidence: 'CONFIRMED',
    title: 'Charged regularly',
    body: 'Same merchant on a steady cycle.',
  },
  {
    confidence: 'LIKELY',
    title: 'Probably subscriptions',
    body: 'Known services or repeating amounts.',
  },
  {
    confidence: 'CHECK',
    title: 'Your call',
    body: 'Could be a one-off, a yearly plan, or already cancelled.',
  },
];

type Decision = boolean | undefined;

export function ReviewScreen({ navigation }: AppScreenProps<'Review'>) {
  const { spacing } = useTheme();
  const { data, error, isLoading, refetch } = useCandidates();
  const review = useReviewCandidates();
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});

  // Strong matches start ticked; the user still sees and can untick every one.
  useEffect(() => {
    if (!data) return;
    setDecisions(prev => {
      const next = { ...prev };
      for (const c of data.candidates) {
        if (!(c.id in next))
          next[c.id] = c.confidence === 'CHECK' ? undefined : true;
      }
      return next;
    });
  }, [data]);

  const candidates = useMemo(() => data?.candidates ?? [], [data]);
  const decided = Object.entries(decisions).filter(
    ([, v]) => v !== undefined,
  ) as [string, boolean][];
  const keepCount = decided.filter(([, v]) => v).length;
  const undecided = candidates.length - decided.length;

  const save = () => {
    if (decided.length === 0) return;
    review.mutate(
      decided.map(([id, accept]) => ({ id, accept })),
      {
        onSuccess: ({ rewards, subscriptions }) => {
          navigation.goBack();
          celebrateRewards(
            subscriptions.length
              ? `${subscriptions.length} added to your list`
              : 'Review saved',
            rewards,
            undecided > 0 ? `${undecided} left to decide later.` : undefined,
          );
        },
        onError: err => toast(errorMessage(err), 'error'),
      },
    );
  };

  return (
    <Screen
      leading="close"
      title="Review what we found"
      subtitle="Confirm the ones you pay for. Nothing is added until you say so."
      footer={
        candidates.length ? (
          <Button
            label={
              keepCount
                ? `Add ${keepCount} ${
                    keepCount === 1 ? 'subscription' : 'subscriptions'
                  }`
                : 'Save decisions'
            }
            onPress={save}
            loading={review.isPending}
            disabled={decided.length === 0}
          />
        ) : undefined
      }
    >
      {isLoading ? (
        <SkeletonList />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : candidates.length === 0 ? (
        <EmptyState
          icon={PartyPopper}
          title="All reviewed"
          body="There is nothing waiting for you. Scan another statement any time."
          action={<Button label="Done" onPress={() => navigation.goBack()} />}
        />
      ) : (
        GROUPS.map(group => {
          const items = candidates.filter(
            c => c.confidence === group.confidence,
          );
          if (!items.length) return null;
          return (
            <View key={group.confidence} style={{ gap: spacing.sm }}>
              <View>
                <AppText variant="heading">{group.title}</AppText>
                <AppText variant="caption" color="textMuted">
                  {group.body}
                </AppText>
              </View>
              {items.map(c => (
                <CandidateCard
                  key={c.id}
                  candidate={c}
                  decision={decisions[c.id]}
                  onDecide={value => {
                    haptics.tap();
                    setDecisions(d => ({
                      ...d,
                      [c.id]: d[c.id] === value ? undefined : value,
                    }));
                  }}
                />
              ))}
            </View>
          );
        })
      )}
    </Screen>
  );
}

function CandidateCard({
  candidate: c,
  decision,
  onDecide,
}: {
  candidate: Candidate;
  decision: Decision;
  onDecide: (accept: boolean) => void;
}) {
  const { colors, spacing, radius } = useTheme();
  const border = decision === true ? colors.success : colors.border;

  return (
    <Surface
      style={{
        gap: spacing.md,
        borderColor: border,
        opacity: decision === false ? 0.6 : 1,
      }}
    >
      <View style={[styles.row, { gap: spacing.md }]}>
        <MerchantAvatar name={c.name} color={c.brandColor} size={40} />
        <View style={styles.flex}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {c.name}
          </AppText>
          <AppText variant="caption" color="textMuted">
            Last charged {formatDay(c.lastCharge)} · {c.chargeCount}{' '}
            {c.chargeCount === 1 ? 'charge' : 'charges'}
          </AppText>
        </View>
        <View style={styles.right}>
          <AppText variant="bodyStrong" tabular>
            {formatMoney(c.lastAmountLocal, c.currency, { exact: true })}
          </AppText>
          {c.priceOriginal && c.originalCurrency ? (
            <AppText variant="caption" color="textMuted" tabular>
              {formatMoney(c.priceOriginal, c.originalCurrency, {
                exact: true,
              })}
            </AppText>
          ) : null}
        </View>
      </View>
      <AppText variant="caption" color="textMuted">
        {c.reason}
      </AppText>
      <View style={[styles.row, { gap: spacing.sm, flexWrap: 'wrap' }]}>
        {c.cadence ? <Chip label={CADENCE_LABEL[c.cadence]} /> : null}
        {c.category ? <Chip label={c.category} /> : null}
      </View>
      <View style={[styles.row, { gap: spacing.sm }]}>
        <Choice
          label="I pay for this"
          icon={Check}
          active={decision === true}
          tone={colors.success}
          onPress={() => onDecide(true)}
          radius={radius.full}
        />
        <Choice
          label="Not a subscription"
          icon={X}
          active={decision === false}
          tone={colors.textMuted}
          onPress={() => onDecide(false)}
          radius={radius.full}
        />
      </View>
    </Surface>
  );
}

function Choice({
  label,
  icon: Icon,
  active,
  tone,
  onPress,
  radius,
}: {
  label: string;
  icon: typeof Check;
  active: boolean;
  tone: string;
  onPress: () => void;
  radius: number;
}) {
  const { colors, spacing } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
      accessibilityLabel={label}
      style={[
        styles.choice,
        {
          borderRadius: radius,
          gap: spacing.xs,
          borderColor: active ? tone : colors.border,
          backgroundColor: active ? `${tone}26` : 'transparent',
        },
      ]}
    >
      <Icon
        size={16}
        color={active ? tone : colors.textMuted}
        strokeWidth={2.5}
      />
      <AppText
        variant="label"
        style={{ color: active ? tone : colors.textMuted }}
        numberOfLines={1}
      >
        {label}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  right: { alignItems: 'flex-end' },
  choice: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
