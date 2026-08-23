import { useColorScheme } from 'react-native';
import { useUIStore } from '../store/uiStore';
import { getTheme, Theme } from '../constants/theme';

export function useAppTheme(): Theme {
  const systemScheme = useColorScheme();
  const themeMode = useUIStore((state) => state.themeMode);

  const activeMode: 'light' | 'dark' =
    themeMode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : themeMode;

  return getTheme(activeMode);
}
