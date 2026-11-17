import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { PressableScale } from './Pressable';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  padded?: boolean;
  raised?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

/** Flat card: depth comes from the surface colour step and a hairline border, not shadows. */
export function Surface({
  children,
  onPress,
  padded = true,
  raised,
  style,
  accessibilityLabel,
  accessibilityHint,
}: Props) {
  const { colors, radius, spacing } = useTheme();
  const base: ViewStyle = {
    backgroundColor: raised ? colors.surfaceRaised : colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: padded ? spacing.lg : 0,
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={[base, style]}
    >
      {children}
    </PressableScale>
  );
}
