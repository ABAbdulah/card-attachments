import { BellRing, FileLock2, ShieldCheck } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import type { AuthScreenProps } from '../../navigation/types';
import { useTheme } from '../../theme';

const PROMISES = [
  {
    icon: ShieldCheck,
    title: 'No bank login, ever',
    body: 'You upload a statement. We never ask for your card number or bank password.',
  },
  {
    icon: FileLock2,
    title: 'Deleted after reading',
    body: 'The file is read in memory and thrown away. Only card payments are kept.',
  },
  {
    icon: BellRing,
    title: 'Warned before you pay',
    body: 'A reminder three days before each renewal, so you can cancel in time.',
  },
];

export function WelcomeScreen({ navigation }: AuthScreenProps<'Welcome'>) {
  const { colors, spacing, radius } = useTheme();

  return (
    <Screen
      footer={
        <Button
          label="Get started"
          onPress={() => navigation.navigate('Email')}
        />
      }
    >
      <View style={{ gap: spacing.lg, paddingTop: spacing.xxl }}>
        <Logo />
        <AppText variant="display" accessibilityRole="header">
          Find every subscription on your card.
        </AppText>
        <AppText variant="body" color="textMuted">
          Upload one bank statement. See what charges you every month, what it
          really costs in your currency, and cancel what you don’t use.
        </AppText>
      </View>
      <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
        {PROMISES.map(({ icon: Icon, title, body }) => (
          <View key={title} style={[styles.row, { gap: spacing.md }]}>
            <View
              style={[
                styles.icon,
                {
                  backgroundColor: colors.surfaceRaised,
                  borderRadius: radius.md,
                },
              ]}
            >
              <Icon color={colors.success} size={22} />
            </View>
            <View style={styles.flex}>
              <AppText variant="bodyStrong">{title}</AppText>
              <AppText variant="caption" color="textMuted">
                {body}
              </AppText>
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

/** App mark: a ring (the savings ring) with a tick through a card. */
export function Logo({ size = 56 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      accessibilityLabel="SubTrack"
    >
      <Circle
        cx={28}
        cy={28}
        r={24}
        stroke={colors.surfaceRaised}
        strokeWidth={6}
        fill="none"
      />
      <Path
        d="M28 4 A24 24 0 1 1 6.2 38"
        stroke={colors.success}
        strokeWidth={6}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M19 28.5 L25.5 35 L37.5 22"
        stroke={colors.text}
        strokeWidth={4.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  icon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
