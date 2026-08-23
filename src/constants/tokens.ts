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
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceSubtle: '#F8FAFC',
  surfaceElevated: '#F1F5F9',
  surfaceMuted: '#F1F5F9',

  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  border: '#E2E8F0',
  borderSubtle: '#F1F5F9',
  borderFocus: '#0F172A',

  primary: '#0F172A',
  primaryForeground: '#FFFFFF',
  primarySubtle: '#F1F5F9',

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
  background: '#0B0F17',
  surface: '#131B2A',
  surfaceSubtle: '#162032',
  surfaceElevated: '#1E293B',
  surfaceMuted: '#1E293B',

  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0F172A',

  border: '#1E293B',
  borderSubtle: '#162032',
  borderFocus: '#38BDF8',

  primary: '#38BDF8',
  primaryForeground: '#0B0F17',
  primarySubtle: '#13283E',

  positive: '#10B981',
  positiveSubtle: '#064E3B',
  positiveForeground: '#A7F3D0',

  negative: '#F87171',
  negativeSubtle: '#450A0A',
  negativeForeground: '#FECACA',

  warning: '#FBBF24',
  warningSubtle: '#451A03',
  warningForeground: '#FDE68A',

  destructive: '#F87171',
  destructiveForeground: '#0B0F17',

  tint: '#38BDF8',
  card: '#131B2A',
  overlay: 'rgba(0, 0, 0, 0.65)',
};
