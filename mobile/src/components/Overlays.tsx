import { Award, Check, CircleAlert, Info, Sparkles } from 'lucide-react-native';
import { useEffect, useMemo } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  FadeOut,
  FadeOutUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptics } from '../lib/haptics';
import { useUi } from '../store/ui';
import { useTheme } from '../theme';
import { AppText } from './AppText';

/** Global toast, shown above everything for 3.5 seconds. */
export function ToastHost() {
  const toast = useUi((s) => s.toast);
  const hide = useUi((s) => s.hideToast);
  const { colors, radius, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(hide, 3500);
    return () => clearTimeout(timer);
  }, [toast, hide]);

  if (!toast) return null;
  const Icon = toast.tone === 'error' ? CircleAlert : toast.tone === 'success' ? Check : Info;
  const tint = toast.tone === 'error' ? colors.danger : toast.tone === 'success' ? colors.success : colors.primary;

  return (
    <Animated.View
      key={toast.id}
      entering={FadeInUp.duration(220)}
      exiting={FadeOutUp.duration(160)}
      pointerEvents="box-none"
      style={[styles.toastWrap, { top: insets.top + spacing.sm, paddingHorizontal: spacing.lg }]}
    >
      <Pressable
        onPress={hide}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={[styles.toast, { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md }]}
      >
        <Icon color={tint} size={20} />
        <AppText variant="label" style={styles.flex}>
          {toast.message}
        </AppText>
      </Pressable>
    </Animated.View>
  );
}

const CONFETTI_COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#F472B6', '#A78BFA', '#FBBF24'];

function ConfettiPiece({ index }: { index: number }) {
  const { width, height } = Dimensions.get('window');
  const seed = useMemo(
    () => ({
      x: Math.random() * width,
      drift: (Math.random() - 0.5) * 160,
      delay: Math.random() * 250,
      rotate: Math.random() * 720 - 360,
      size: 6 + Math.random() * 6,
      color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    }),
    [index, width],
  );
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(seed.delay, withTiming(1, { duration: 1500, easing: Easing.out(Easing.quad) }));
  }, [seed.delay, t]);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - t.value * 0.9,
    transform: [
      { translateX: seed.x + seed.drift * t.value },
      { translateY: -40 + t.value * height * 0.75 },
      { rotate: `${seed.rotate * t.value}deg` },
    ],
  }));
  return <Animated.View style={[styles.confetti, { width: seed.size, height: seed.size * 1.6, backgroundColor: seed.color }, style]} />;
}

/**
 * Short celebration after a reward: confetti, "+XP" and any new badge.
 * Never covers financial information for long: it closes itself after 2.6 s.
 */
export function CelebrationHost() {
  const celebration = useUi((s) => s.celebration);
  const end = useUi((s) => s.endCelebration);
  const reduced = useReducedMotion();
  const { colors, radius, spacing } = useTheme();

  useEffect(() => {
    if (!celebration) return;
    haptics.success();
    const timer = setTimeout(end, 2600);
    return () => clearTimeout(timer);
  }, [celebration, end]);

  if (!celebration) return null;
  const { rewards } = celebration;

  return (
    <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(200)} style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: colors.scrim }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={end} accessibilityRole="button" accessibilityLabel="Dismiss" />
      {!reduced ? Array.from({ length: 28 }, (_, i) => <ConfettiPiece key={i} index={i} />) : null}
      <Animated.View
        entering={ZoomIn.springify().damping(14)}
        accessibilityLiveRegion="assertive"
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md }]}
      >
        <View style={[styles.icon, { backgroundColor: `${colors.reward}26` }]}>
          <Sparkles color={colors.reward} size={30} />
        </View>
        <AppText variant="heading" align="center">
          {celebration.title}
        </AppText>
        {celebration.subtitle ? (
          <AppText variant="body" color="textMuted" align="center">
            {celebration.subtitle}
          </AppText>
        ) : null}
        {rewards && rewards.xpGained > 0 ? (
          <AppText variant="title" color="reward" align="center" tabular>
            +{rewards.xpGained} XP
          </AppText>
        ) : null}
        {rewards?.leveledUp ? (
          <AppText variant="label" color="reward" align="center">
            Level up! You reached level {rewards.level}.
          </AppText>
        ) : null}
        {rewards?.newBadges.map((badge) => (
          <View key={badge.id} style={[styles.badgeRow, { backgroundColor: colors.surfaceRaised, borderRadius: radius.md, padding: spacing.md, gap: spacing.md }]}>
            <Award color={colors.reward} size={22} />
            <View style={styles.flex}>
              <AppText variant="overline" color="textMuted">
                BADGE UNLOCKED
              </AppText>
              <AppText variant="bodyStrong">{badge.name}</AppText>
            </View>
          </View>
        ))}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  toastWrap: { position: 'absolute', left: 0, right: 0, zIndex: 200 },
  toast: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  confetti: { position: 'absolute', top: 0, left: 0, borderRadius: 2 },
  card: { width: '82%', maxWidth: 360, alignItems: 'stretch', borderWidth: 1 },
  icon: { alignSelf: 'center', width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  badgeRow: { flexDirection: 'row', alignItems: 'center' },
});
