import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme';
import type { ColorTokens } from '../theme/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type RingProps = {
  progress: number;
  size?: number;
  stroke?: number;
  color?: keyof ColorTokens;
  children?: ReactNode;
  accessibilityLabel?: string;
};

export function ProgressRing({ progress, size = 180, stroke = 14, color = 'success', children, accessibilityLabel }: RingProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const value = useSharedValue(0);

  useEffect(() => {
    const target = Math.max(0, Math.min(progress, 1));
    value.value = reduced ? target : withTiming(target, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [progress, reduced, value]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - value.value) }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(Math.min(progress, 1) * 100) }}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceRaised} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors[color]}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
        />
      </Svg>
      {children}
    </View>
  );
}

type BarProps = { progress: number; color?: keyof ColorTokens; height?: number; accessibilityLabel?: string };

export function ProgressBar({ progress, color = 'primary', height = 8, accessibilityLabel }: BarProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const value = useSharedValue(0);

  useEffect(() => {
    const target = Math.max(0, Math.min(progress, 1));
    value.value = reduced ? target : withTiming(target, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [progress, reduced, value]);

  const fill = useAnimatedStyle(() => ({ width: `${value.value * 100}%` }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(Math.min(progress, 1) * 100) }}
      style={{ height, borderRadius: height / 2, backgroundColor: colors.surfaceRaised, overflow: 'hidden' }}
    >
      <Animated.View style={[{ height, borderRadius: height / 2, backgroundColor: colors[color] }, fill]} />
    </View>
  );
}
