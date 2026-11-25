import { useTranslation } from 'react-i18next';
import { Text } from '@/src/ui/Text';

/**
 * Where a dish on the bill came from when it wasn't ordered on a tablet: the cashier (POS), a kiosk,
 * or a guest's phone (QR menu, app). On a table's bill (merged, or auto-merged with the waiter's
 * order) it answers "we didn't order this". Nothing for the tablet's own dishes, so a table that only
 * orders here sees no change.
 */
export const ItemSource = ({ channel }: { channel?: string | null }) => {
  const { t } = useTranslation('language');
  if (!channel || channel === 'TB') return null;
  const label =
    channel === 'P' ? t('mainPage.fromWaiter') : channel === 'K' ? t('mainPage.fromKiosk') : t('mainPage.fromPhone');
  return (
    <Text className="text-sm text-muted" numberOfLines={1}>
      {label}
    </Text>
  );
};
