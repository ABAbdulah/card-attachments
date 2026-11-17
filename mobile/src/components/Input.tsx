import type { LucideIcon } from 'lucide-react-native';
import { useState, type ComponentRef, type ReactNode, type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '../theme';
import { AppText } from './AppText';

type Props = TextInputProps & {
  ref?: Ref<ComponentRef<typeof TextInput>>;
  label?: string;
  helper?: string;
  error?: string | null;
  icon?: LucideIcon;
  right?: ReactNode;
};

export function Input({
  ref,
  label,
  helper,
  error,
  icon: Icon,
  right,
  style,
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const { colors, radius, spacing, typography } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error
    ? colors.danger
    : focused
    ? colors.primary
    : colors.border;

  return (
    <View style={{ gap: spacing.xs + 2 }}>
      {label ? (
        <AppText variant="label" color="textMuted">
          {label}
        </AppText>
      ) : null}
      <View
        style={[
          styles.field,
          {
            borderColor,
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            paddingHorizontal: spacing.md,
            gap: spacing.sm,
          },
        ]}
      >
        {Icon ? <Icon color={colors.textMuted} size={18} /> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          accessibilityLabel={label}
          maxFontSizeMultiplier={1.6}
          {...rest}
          onFocus={e => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={e => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, typography.body, { color: colors.text }, style]}
        />
        {right}
      </View>
      {error ? (
        <AppText variant="caption" color="danger" accessibilityRole="alert">
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="caption" color="textMuted">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 52,
  },
  input: { flex: 1, paddingVertical: 12 },
});
