import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { haptics } from '../lib/haptics';
import { useTheme } from '../theme';

type Props = {
  value: boolean;
  onChange: (next: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
};

const WIDTH = 52;
const HEIGHT = 32;
const THUMB = 26;

/** Active/cancelled switch with a spring thumb. Green means the subscription is active (still charging). */
export function Toggle({ value, onChange, accessibilityLabel, disabled }: Props) {
  const { colors, motion } = useTheme();
  const reduced = useReducedMotion();
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = reduced ? withTiming(value ? 1 : 0, { duration: 0 }) : withSpring(value ? 1 : 0, motion.spring);
  }, [value, reduced, progress, motion.spring]);

  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [colors.surfaceRaised, colors.success]),
    borderColor: interpolateColor(progress.value, [0, 1], [colors.border, colors.success]),
  }));
  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * (WIDTH - THUMB - 6) }],
  }));

  return (
    <Pressable
      onPress={() => {
        haptics.toggle();
        onChange(!value);
      }}
      disabled={disabled}
      hitSlop={10}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Animated.View style={[{ width: WIDTH, height: HEIGHT, borderRadius: HEIGHT / 2, borderWidth: 1, padding: 2, justifyContent: 'center' }, track]}>
        <Animated.View style={[{ width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: '#FFFFFF' }, thumb]} />
      </Animated.View>
    </Pressable>
  );
}
