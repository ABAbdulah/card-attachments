import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { AppText } from './AppText';

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

/** Bottom sheet over a dimmed screen. Tapping the scrim or the back button closes it. */
export function Sheet({ visible, onClose, title, children }: Props) {
  const { colors, radius, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      {visible ? (
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Animated.View
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(120)}
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
          >
            <Pressable
              style={styles.fill}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
            />
          </Animated.View>
          <Animated.View
            entering={SlideInDown.springify().damping(20).stiffness(220)}
            exiting={SlideOutDown.duration(160)}
            style={[
              styles.panel,
              {
                backgroundColor: colors.surface,
                borderTopLeftRadius: radius.xl,
                borderTopRightRadius: radius.xl,
                borderColor: colors.border,
                padding: spacing.xl,
                paddingBottom: insets.bottom + spacing.xl,
                gap: spacing.lg,
              },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            {title ? (
              <AppText variant="heading" accessibilityRole="header">
                {title}
              </AppText>
            ) : null}
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'flex-end' },
  panel: { borderWidth: 1, borderBottomWidth: 0, maxHeight: '88%' },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: -8,
  },
});
