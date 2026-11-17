import { Text, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '../theme';
import type { ColorTokens, TypographyVariant } from '../theme/tokens';

type Props = TextProps & {
  variant?: TypographyVariant;
  color?: keyof ColorTokens;
  tabular?: boolean;
  align?: TextStyle['textAlign'];
};

export function AppText({
  variant = 'body',
  color = 'text',
  tabular,
  align,
  style,
  ...rest
}: Props) {
  const { colors, typography, tabularNumbers } = useTheme();
  return (
    <Text
      maxFontSizeMultiplier={1.6}
      {...rest}
      style={[
        typography[variant],
        { color: colors[color] },
        tabular && tabularNumbers,
        align && { textAlign: align },
        style,
      ]}
    />
  );
}
