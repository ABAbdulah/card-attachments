import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';

type Props = { title: string; note: string };

/** Stand-in for screens that are not built yet. Removed as each task lands. */
export function PlaceholderScreen({ title, note }: Props) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, padding: spacing.xl },
      ]}
    >
      <Text style={[typography.title, { color: colors.text }]}>{title}</Text>
      <Text
        style={[
          typography.body,
          styles.note,
          { color: colors.textMuted, marginTop: spacing.sm },
        ]}
      >
        {note}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  note: { textAlign: 'center' },
});
