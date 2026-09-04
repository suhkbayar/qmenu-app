import { useMemo } from 'react';
import { useThemeStore } from '@/src/store/theme.store';
import { giftPalette, GiftPalette } from '@/src/constants';

export type GiftTheme = GiftPalette & { isDark: boolean };

export const useGiftTheme = (): GiftTheme => {
  const isDark = useThemeStore((s) => s.isDark);

  return useMemo(() => ({ ...giftPalette(isDark), isDark }), [isDark]);
};
