import type { LucideIcon } from 'lucide-react-native';
import { RefreshCw } from 'lucide-react-native';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { errorMessage } from '../api/client';
import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';

type EmptyProps = {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
};

export function EmptyState({ icon: Icon, title, body, action }: EmptyProps) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      style={[styles.center, { gap: spacing.md, paddingVertical: spacing.xxl }]}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: radius.lg,
          backgroundColor: colors.surfaceRaised,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon color={colors.primary} size={28} />
      </View>
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      {body ? (
        <AppText
          variant="body"
          color="textMuted"
          align="center"
          style={{ maxWidth: 320 }}
        >
          {body}
        </AppText>
      ) : null}
      {action ? (
        <View style={{ marginTop: spacing.sm, alignSelf: 'stretch' }}>
          {action}
        </View>
      ) : null}
    </View>
  );
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  const { colors, spacing } = useTheme();
  return (
    <View
      style={[styles.center, { gap: spacing.md, paddingVertical: spacing.xxl }]}
    >
      <AppText variant="heading" align="center">
        Couldn’t load this
      </AppText>
      <AppText variant="body" color="textMuted" align="center">
        {errorMessage(error)}
      </AppText>
      <Button
        label="Try again"
        variant="secondary"
        icon={RefreshCw}
        onPress={onRetry}
        compact
      />
      <View style={{ height: 1, width: 40, backgroundColor: colors.border }} />
    </View>
  );
}

export function Skeleton({
  height = 20,
  width = '100%',
  radius: r,
}: {
  height?: number;
  width?: DimensionValue;
  radius?: number;
}) {
  const { colors, radius } = useTheme();
  const reduced = useReducedMotion();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    if (!reduced)
      opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [opacity, reduced]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[
        {
          height,
          width,
          borderRadius: r ?? radius.md,
          backgroundColor: colors.surfaceRaised,
        },
        style,
      ]}
    />
  );
}

/** Placeholder for a list of rows while it loads. */
export function SkeletonList({ rows = 4 }: { rows?: number }) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.md }} accessibilityLabel="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={68} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
