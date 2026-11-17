import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';
import type { ColorTokens } from '../theme/tokens';
import { AppText } from './AppText';
import { PressableScale } from './Pressable';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: LucideIcon;
  tone?: keyof Pick<
    ColorTokens,
    'primary' | 'success' | 'reward' | 'danger' | 'textMuted'
  >;
};

/** Selectable pill, or a static status tag when it has no onPress. */
export function Chip({ label, selected, onPress, icon: Icon, tone }: Props) {
  const { colors, radius, spacing } = useTheme();
  const accent = tone ? colors[tone] : colors.primary;
  const fg = selected ? colors.onPrimary : tone ? accent : colors.text;
  const style = {
    backgroundColor: selected
      ? colors.primary
      : tone
      ? `${accent}1F`
      : colors.surfaceRaised,
    borderColor: selected
      ? colors.primary
      : tone
      ? 'transparent'
      : colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  };
  const content = (
    <>
      {Icon ? <Icon size={14} color={fg} strokeWidth={2.4} /> : null}
      <AppText variant="label" style={{ color: fg }} numberOfLines={1}>
        {label}
      </AppText>
    </>
  );

  if (!onPress)
    return <View style={[styles.chip, styles.static, style]}>{content}</View>;
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      hitSlop={6}
      style={[styles.chip, styles.interactive, style]}
    >
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  static: { minHeight: 26 },
  interactive: { minHeight: 38 },
});
