import {
  lightColors,
  darkColors,
  ColorScheme,
  spacing,
  radii,
  typography,
  motion,
} from '../constants/tokens';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Theme {
  colors: ColorScheme;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  motion: typeof motion;
  isDark: boolean;
}

export function getTheme(mode: 'light' | 'dark'): Theme {
  const isDark = mode === 'dark';
  return {
    colors: isDark ? darkColors : lightColors,
    spacing,
    radii,
    typography,
    motion,
    isDark,
  };
}
