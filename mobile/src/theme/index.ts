import { useColorScheme } from 'react-native';
import {
  darkColors,
  fonts,
  iconSize,
  lightColors,
  motion,
  radius,
  spacing,
  tabularNumbers,
  touchTarget,
  typography,
} from './tokens';

export function useTheme() {
  const isDark = useColorScheme() !== 'light';
  return {
    isDark,
    colors: isDark ? darkColors : lightColors,
    spacing,
    radius,
    typography,
    fonts,
    tabularNumbers,
    motion,
    iconSize,
    touchTarget,
  };
}

export type Theme = ReturnType<typeof useTheme>;
