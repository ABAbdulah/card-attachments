import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { AppText } from './AppText';

type Props = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  /** "back" shows a chevron, "close" an X (for modal flows). */
  leading?: 'back' | 'close';
  actions?: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
};

export function Screen({ title, subtitle, children, leading, actions, footer, scroll = true, refreshing, onRefresh }: Props) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const LeadingIcon = leading === 'close' ? X : ChevronLeft;

  const header =
    title || leading || actions ? (
      <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingTop: insets.top + spacing.sm, paddingBottom: spacing.sm }]}>
        <View style={styles.headerRow}>
          {leading ? (
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={leading === 'close' ? 'Close' : 'Back'}
              style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <LeadingIcon color={colors.text} size={22} />
            </Pressable>
          ) : null}
          <View style={styles.flex} />
          <View style={[styles.actions, { gap: spacing.sm }]}>{actions}</View>
        </View>
        {title ? (
          <AppText variant="title" accessibilityRole="header" style={{ marginTop: leading || actions ? spacing.md : 0 }}>
            {title}
          </AppText>
        ) : null}
        {subtitle ? (
          <AppText variant="body" color="textMuted" style={{ marginTop: spacing.xs }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
    ) : (
      <View style={{ height: insets.top }} />
    );

  const contentStyle = { padding: spacing.lg, paddingBottom: (footer ? spacing.lg : insets.bottom + spacing.xxxl) as number, gap: spacing.lg };

  return (
    <KeyboardAvoidingView style={[styles.flex, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {header}
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={contentStyle}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.surface} /> : undefined}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, contentStyle]}>{children}</View>
      )}
      {footer ? (
        <View style={[styles.footer, { padding: spacing.lg, paddingBottom: insets.bottom + spacing.lg, borderTopColor: colors.border, backgroundColor: colors.background }]}>
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

/** Round icon button for screen headers (settings, alerts, add). */
export function HeaderButton({ icon: Icon, label, onPress, badge }: { icon: typeof X; label: string; onPress: () => void; badge?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <Icon color={colors.text} size={20} />
      {badge ? <View style={[styles.badge, { backgroundColor: colors.danger, borderColor: colors.surface }]} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {},
  headerRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 9, right: 10, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth },
});
