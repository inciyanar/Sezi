import { resolveSweetTheme, type SweetTheme } from '@sezi/shared';
import { useColorScheme } from 'react-native';

import { useSettings } from '@/lib/settings';

/** Uygulama teması: yüksek kontrast açıksa o; değilse ayardaki tema ("sistem" ise cihaz tercihi), renk körlüğü seçeneğiyle. */
export function useSweetTheme(): SweetTheme {
  const { settings } = useSettings();
  return resolveSweetTheme(useIsDark() ? 'dark' : 'light', settings);
}

/** Koyu tema etkin mi (durum çubuğu ve gezinti teması için). Yüksek kontrast açık temadır. */
export function useIsDark(): boolean {
  const scheme = useColorScheme();
  const { settings } = useSettings();
  if (settings.highContrast) return false;
  return settings.themeMode === 'dark' || (settings.themeMode === 'system' && scheme === 'dark');
}
