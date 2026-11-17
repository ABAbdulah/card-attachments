import { View } from 'react-native';
import { initials } from '../lib/format';
import { useTheme } from '../theme';
import { AppText } from './AppText';

type Props = { name: string; color?: string | null; size?: number; muted?: boolean };

/** Brand-coloured initials. Real logos need each brand's permission, so the app uses initials. */
export function MerchantAvatar({ name, color, size = 44, muted }: Props) {
  const { colors, fonts } = useTheme();
  const bg = muted ? colors.surfaceRaised : (color ?? colors.surfaceRaised);
  const fg = muted || !color ? colors.textMuted : readableOn(color);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size / 3,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <AppText style={{ color: fg, fontFamily: fonts.bold, fontSize: size * 0.36, lineHeight: size * 0.46 }}>{initials(name)}</AppText>
    </View>
  );
}

/** Black or white text, whichever contrasts better with the brand colour. */
function readableOn(hex: string): string {
  const value = hex.replace('#', '');
  if (value.length !== 6) return '#FFFFFF';
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255) as [number, number, number];
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.6 ? '#0B1120' : '#FFFFFF';
}
