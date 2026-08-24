/**
 * Settle Design Tokens
 * Reconciled with Stitch Mobile Design System & design.md
 */

export const spacing = {
  none: 0,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  massive: 64,
  gutter: 16,
  marginMobile: 20,
} as const;

export const radii = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const typography = {
  fontSizes: {
    caption: 11,
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    displaySm: 32,
    displayMd: 40,
    displayLg: 48,
  },
  fontWeights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeights: {
    tight: 1.15,
    snug: 1.3,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const motion = {
  durations: {
    micro: 150,
    standard: 250,
    expressive: 400,
  },
} as const;

export interface ColorScheme {
  // Base Surfaces
  background: string;
  surface: string;
  surfaceSubtle: string;
  surfaceElevated: string;
  surfaceMuted: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // Borders
  border: string;
  borderSubtle: string;
  borderFocus: string;

  // Brand / Action Primary
  primary: string;
  primaryForeground: string;
  primarySubtle: string;

  // Semantics
  positive: string;
  positiveSubtle: string;
  positiveForeground: string;

  negative: string;
  negativeSubtle: string;
  negativeForeground: string;

  warning: string;
  warningSubtle: string;
  warningForeground: string;

  destructive: string;
  destructiveForeground: string;

  // Components
  tint: string;
  card: string;
  overlay: string;
}

export const lightColors: ColorScheme = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSubtle: '#F1F5F9',
  surfaceElevated: '#FFFFFF',
  surfaceMuted: '#E2E8F0',

  textPrimary: '#0A0F1D',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  border: '#E2E8F0',
  borderSubtle: '#F1F5F9',
  borderFocus: '#0284C7',

  primary: '#0284C7',
  primaryForeground: '#FFFFFF',
  primarySubtle: '#E0F2FE',

  positive: '#10B981',
  positiveSubtle: '#ECFDF5',
  positiveForeground: '#065F46',

  negative: '#EF4444',
  negativeSubtle: '#FEF2F2',
  negativeForeground: '#991B1B',

  warning: '#F59E0B',
  warningSubtle: '#FFFBEB',
  warningForeground: '#92400E',

  destructive: '#EF4444',
  destructiveForeground: '#FFFFFF',

  tint: '#0F172A',
  card: '#FFFFFF',
  overlay: 'rgba(15, 23, 42, 0.4)',
};

export const darkColors: ColorScheme = {
  background: '#0B0B0D',
  surface: '#111113',
  surfaceSubtle: '#141417',
  surfaceElevated: '#17171A',
  surfaceMuted: '#1E1E22',

  textPrimary: '#F5F5F7',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  textInverse: '#0B0B0D',

  border: 'rgba(255, 255, 255, 0.08)',
  borderSubtle: 'rgba(255, 255, 255, 0.04)',
  borderFocus: '#0A84FF',

  primary: '#0A84FF',
  primaryForeground: '#FFFFFF',
  primarySubtle: 'rgba(10, 132, 255, 0.12)',

  positive: '#30D158',
  positiveSubtle: 'rgba(48, 209, 88, 0.12)',
  positiveForeground: '#30D158',

  negative: '#FF453A',
  negativeSubtle: 'rgba(255, 69, 58, 0.12)',
  negativeForeground: '#FF453A',

  warning: '#FFD60A',
  warningSubtle: 'rgba(255, 214, 10, 0.12)',
  warningForeground: '#FFD60A',

  destructive: '#FF453A',
  destructiveForeground: '#FFFFFF',

  tint: '#0A84FF',
  card: '#111113',
  overlay: 'rgba(0, 0, 0, 0.72)',
};
