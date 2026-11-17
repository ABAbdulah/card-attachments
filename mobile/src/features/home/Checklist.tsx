import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { CircleCheck, Circle, ChevronRight } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Dashboard } from '../../api/types';
import { AppText } from '../../components/AppText';
import { ProgressBar } from '../../components/Progress';
import { Surface } from '../../components/Surface';
import { haptics } from '../../lib/haptics';
import {
  enableReminders,
  getPrefs,
  remindersActive,
  setPrefs,
} from '../../lib/reminders';
import { toast } from '../../store/ui';
import { useTheme } from '../../theme';

type Step = {
  id: string;
  title: string;
  reward?: string;
  done: boolean;
  locked?: boolean;
  onPress: () => void;
};

/**
 * First-run checklist: the five things that make the app useful, each one
 * also a source of XP. Hides itself once everything is done or when dismissed.
 */
export function Checklist({ data }: { data: Dashboard }) {
  const navigation = useNavigation();
  const { colors, spacing, radius } = useTheme();
  const [reminders, setReminders] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useFocusEffect(
    useCallback(() => {
      remindersActive().then(setReminders);
      getPrefs().then(p => setDismissed(p.checklistDismissed));
    }, []),
  );

  const scanned = data.statements > 0;
  const steps: Step[] = [
    {
      id: 'scan',
      title: 'Scan a bank statement',
      reward: '+30 XP',
      done: scanned,
      onPress: () => navigation.navigate('Import'),
    },
    {
      id: 'review',
      title: 'Review what we found',
      reward: '+25 XP',
      done: scanned && data.pendingCandidates === 0,
      locked: !scanned,
      onPress: () => navigation.navigate('Review'),
    },
    {
      id: 'reminders',
      title: 'Turn on renewal reminders',
      done: reminders === true,
      onPress: async () => {
        if (await enableReminders()) {
          await setPrefs({ reminders: true });
          setReminders(true);
          haptics.success();
        } else {
          toast(
            'Allow notifications in your phone settings to get reminders.',
            'error',
          );
        }
      },
    },
    {
      id: 'cancel',
      title: 'Cancel one you don’t use',
      reward: '+50 XP',
      done: data.cancelledCount > 0,
      onPress: () => navigation.navigate('Tabs', { screen: 'Subscriptions' }),
    },
    {
      id: 'goal',
      title: 'Set a savings goal',
      done: data.hasSavingsGoal,
      onPress: () => navigation.navigate('Tabs', { screen: 'Progress' }),
    },
  ];

  const done = steps.filter(s => s.done).length;
  if (
    reminders === null ||
    dismissed === null ||
    dismissed ||
    done === steps.length
  )
    return null;

  return (
    <Surface style={{ gap: spacing.md }}>
      <View style={[styles.row, styles.between]}>
        <View>
          <AppText variant="heading">Get set up</AppText>
          <AppText variant="caption" color="textMuted" tabular>
            {done} of {steps.length} done
          </AppText>
        </View>
        <Pressable
          onPress={async () => {
            await setPrefs({ checklistDismissed: true });
            setDismissed(true);
          }}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Hide the setup checklist"
        >
          <AppText variant="label" color="textMuted">
            Hide
          </AppText>
        </Pressable>
      </View>
      <ProgressBar
        progress={done / steps.length}
        color="success"
        height={6}
        accessibilityLabel="Setup progress"
      />
      <View>
        {steps.map(step => {
          const Icon = step.done ? CircleCheck : Circle;
          const disabled = step.done || step.locked;
          return (
            <Pressable
              key={step.id}
              onPress={step.onPress}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ disabled: !!disabled, checked: step.done }}
              accessibilityLabel={`${step.title}${step.done ? ', done' : ''}`}
              style={({ pressed }) => [
                styles.row,
                styles.step,
                {
                  gap: spacing.md,
                  borderRadius: radius.md,
                  backgroundColor: pressed
                    ? colors.surfaceRaised
                    : 'transparent',
                  opacity: step.locked ? 0.5 : 1,
                },
              ]}
            >
              <Icon
                color={step.done ? colors.success : colors.textMuted}
                size={22}
              />
              <AppText
                variant="body"
                color={step.done ? 'textMuted' : 'text'}
                style={[styles.flex, step.done && styles.struck]}
              >
                {step.title}
              </AppText>
              {!step.done && step.reward ? (
                <AppText variant="label" color="reward">
                  {step.reward}
                </AppText>
              ) : null}
              {!disabled ? (
                <ChevronRight color={colors.textMuted} size={18} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { justifyContent: 'space-between' },
  step: { minHeight: 48, paddingHorizontal: 4 },
  struck: { textDecorationLine: 'line-through' },
});
