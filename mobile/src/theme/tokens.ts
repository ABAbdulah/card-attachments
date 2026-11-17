/**
 * Design tokens. Components read these through useTheme(); never hardcode
 * colors, spacing or radii in a screen. See DESIGN.md for the rationale.
 */

export type ColorTokens = {
  background: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  /** Money saved, cancelled subscriptions, positive progress. */
  success: string;
  /** Streaks, XP, badges. The only "game" color. */
  reward: string;
  danger: string;
  scrim: string;
};

export const darkColors: ColorTokens = {
  background: '#0B1120',
  surface: '#131C2E',
  surfaceRaised: '#1B2640',
  border: 'rgba(255,255,255,0.08)',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  primary: '#2563EB',
  onPrimary: '#FFFFFF',
  success: '#10B981',
  reward: '#F59E0B',
  danger: '#F87171',
  scrim: 'rgba(0,0,0,0.6)',
};

export const lightColors: ColorTokens = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceRaised: '#EEF2F7',
  border: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#475569',
  primary: '#1E40AF',
  onPrimary: '#FFFFFF',
  success: '#047857',
  reward: '#B45309',
  danger: '#DC2626',
  scrim: 'rgba(15,23,42,0.5)',
};

/** 4pt grid. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

/** IBM Plex Sans, one file per weight (fontWeight is not combined with custom fonts on Android). */
export const fonts = {
  regular: 'IBMPlexSans-Regular',
  medium: 'IBMPlexSans-Medium',
  semibold: 'IBMPlexSans-SemiBold',
  bold: 'IBMPlexSans-Bold',
} as const;

export const typography = {
  /** Hero money figures on the dashboard. */
  display: { fontFamily: fonts.bold, fontSize: 40, lineHeight: 48 },
  title: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 34 },
  heading: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 26 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  overline: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.6 },
} as const;

export type TypographyVariant = keyof typeof typography;

/** Apply to every money figure so digits do not shift while animating. */
export const tabularNumbers = { fontVariant: ['tabular-nums'] } as const;

export const motion = {
  fast: 150,
  base: 220,
  slow: 320,
  /** Reanimated spring for presses, toggles and celebrations. */
  spring: { damping: 18, stiffness: 220 },
} as const;

export const iconSize = { sm: 16, md: 24, lg: 32 } as const;

/** Minimum touch target (Android 48dp covers the iOS 44pt minimum). */
export const touchTarget = 48;
