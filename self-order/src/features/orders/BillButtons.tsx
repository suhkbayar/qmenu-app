import { View } from 'react-native';
import { Button, cn, useThemeColor } from 'heroui-native';
import { ReceiptText } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useCheckout } from '@/src/features/checkout/checkoutStore';
import { useServiceRequest } from '@/src/features/service/useServiceRequest';
import { useSessionStore } from '@/src/features/session/sessionStore';
import { IOrder } from '@/src/types';
import { Spinner } from '@/src/ui/Spinner';

/**
 * Settling up, the guest's choice: ask staff for the bill, or pay it here (the order's checkout) when
 * the branch has online payments. Side by side in My orders; stacked in the narrower order panel,
 * Pay on top.
 */
export const BillButtons = ({ order, stacked = false }: { order: IOrder; stacked?: boolean }) => {
  const { t } = useTranslation('language');
  const foreground = useThemeColor('foreground');
  const canPayHere = useSessionStore((s) => (s.participant?.payments?.length ?? 0) > 0);
  const { send, pending } = useServiceRequest();
  const openCheckout = useCheckout((s) => s.open);

  return (
    // Stacked reverses the order, so Pay sits on top where the Order button was
    <View className={cn('gap-3', stacked ? 'flex-col-reverse' : 'flex-row')}>
      <Button
        size="lg"
        variant="outline"
        className={cn('h-15 rounded-[18px] border-2 border-foreground', !stacked && 'flex-1')}
        isDisabled={!!pending}
        onPress={() => send('bill')}
      >
        {pending === 'bill' ? <Spinner /> : <ReceiptText size={20} color={foreground} />}
        <Button.Label numberOfLines={1} className="font-bold">
          {t('mainPage.request_bill')}
        </Button.Label>
      </Button>
      {canPayHere && !!order.id && (
        <Button
          size="lg"
          className={cn('h-15 rounded-[18px]', !stacked && 'flex-1')}
          onPress={() => openCheckout(order.id!, { order })}
        >
          <Button.Label numberOfLines={1} className="font-bold">
            {t('mainPage.pay')}
          </Button.Label>
        </Button>
      )}
    </View>
  );
};
