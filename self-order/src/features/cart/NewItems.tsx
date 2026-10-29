import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Button, PressableFeedback, Spinner, Tabs, useThemeColor } from 'heroui-native';
import { Gift } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { TABLE_MESSAGE_STICKERS, TYPE } from '@/src/constants';
import { useSessionStore } from '@/src/features/session/sessionStore';
import { Sticker } from '@/src/features/social/Sticker';
import { formatMoney } from '@/src/lib/format';
import { IOrderItem } from '@/src/types';
import { Text } from '@/src/ui/Text';
import { CartLine } from './CartLine';
import { useCartStore, useCartTotals } from './cartStore';
import { NoteDialog } from './NoteDialog';
import { usePlaceOrder } from './usePlaceOrder';

/**
 * The order panel's top block: dishes chosen but not sent yet, newest first, in their own tint so they
 * stand apart from what's been ordered below them, as on a till. Quantities, kitchen notes, and a gift
 * for another table. Nothing while the cart is empty.
 */
export const NewItems = () => {
  const { t } = useTranslation('language');
  const accentForeground = useThemeColor('accent-foreground');
  const giftEnabled = useSessionStore((s) => s.config?.giftOrder === true);
  const items = useCartStore((s) => s.items);
  const totals = useCartTotals();
  const giftItems = giftEnabled ? items.filter((i) => i.giftToTableId) : [];
  const ownItems = (giftItems.length ? items.filter((i) => !i.giftToTableId) : items).slice().reverse();

  // The line whose kitchen note is being written
  const setComment = useCartStore((s) => s.setComment);
  const [noteFor, setNoteFor] = useState<IOrderItem | null>(null);
  const editNote = useCallback((item: IOrderItem) => setNoteFor(item), []);

  if (!items.length) return null;

  return (
    <>
      <View className="gap-4 rounded-[22px] bg-accent-tint p-4">
        <View className="flex-row items-center gap-2.5">
          <View className="rounded-full bg-accent px-3 py-1">
            {/* The colour through style: theme text colours on fills were unreliable on the tablets */}
            <Text className="text-sm font-bold uppercase" style={{ color: accentForeground }} numberOfLines={1}>
              {t('mainPage.newItems')}
            </Text>
          </View>
          <Text className="font-semibold text-muted" numberOfLines={1}>
            {totals.quantity}
          </Text>
        </View>
        {giftItems.length > 0 && <GiftCard items={giftItems} onEditNote={editNote} />}
        {ownItems.map((item) => (
          <CartLine key={item.uuid} item={item} onEditNote={editNote} />
        ))}
      </View>

      <NoteDialog
        target={noteFor}
        onSave={(comment) => {
          if (noteFor) setComment(noteFor.uuid, comment);
          setNoteFor(null);
        }}
        onClose={() => setNoteFor(null)}
      />
    </>
  );
};

/** The order panel's footer while there are new dishes: eat in or take away, and Order with the total. */
export const SendBar = () => {
  const { t } = useTranslation('language');
  const accentForeground = useThemeColor('accent-foreground');
  const totals = useCartTotals();
  const order = usePlaceOrder();

  return (
    <View className="gap-3.5 border-t border-border px-6.5 pb-6.5 pt-4.5">
      {order.canTakeAway && (
        <Tabs value={order.serviceType} onValueChange={order.setServiceType}>
          <Tabs.List className="w-full">
            <Tabs.Indicator />
            {[TYPE.DINIG, TYPE.TAKE_AWAY].map((type) => (
              <Tabs.Trigger key={type} value={type} className="flex-1">
                <Tabs.Label numberOfLines={1}>{t(`mainPage.${type}`)}</Tabs.Label>
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </Tabs>
      )}
      {/* One button that says what it does and what it comes to; it sends straight away */}
      <Button
        size="lg"
        isDisabled={order.loading}
        className="h-18 justify-between rounded-[20px] px-6.5"
        onPress={order.placeOrder}
      >
        {order.loading ? (
          // Spinners default to the brand yellow, which vanishes on the yellow button
          <Spinner className="mx-auto" color={accentForeground} />
        ) : (
          <>
            <Button.Label numberOfLines={1} className="text-xl font-bold">
              {t('mainPage.Order')}
            </Button.Label>
            <Button.Label numberOfLines={1} className="text-xl font-bold">
              {formatMoney(totals.amount)}
            </Button.Label>
          </>
        )}
      </Button>
    </View>
  );
};

/** The gift for another table: its lines and sticker. It goes out with this order; Cancel keeps the dishes as ours. */
const GiftCard = ({ items, onEditNote }: { items: IOrderItem[]; onEditNote: (item: IOrderItem) => void }) => {
  const { t } = useTranslation('language');
  const clearGift = useCartStore((s) => s.clearGift);
  const stickerId = useCartStore((s) => s.giftStickerId);
  const sticker = TABLE_MESSAGE_STICKERS.find((s) => s.id === stickerId);

  return (
    <View className="gap-3.5 rounded-[20px] bg-gift-soft p-3.5">
      <View className="flex-row items-center gap-2.5">
        {/* White on the red, as a fixed colour: theme text colours on fills were unreliable */}
        <View className="size-8 items-center justify-center rounded-[10px] bg-gift">
          <Gift size={17} color="#FFFFFF" strokeWidth={2.3} />
        </View>
        <Text className="min-w-0 flex-1 font-bold" numberOfLines={1}>
          {t('mainPage.gift_card_title', { table: items[0].giftToTableName })}
        </Text>
        <PressableFeedback
          onPress={clearGift}
          accessibilityRole="button"
          accessibilityLabel={t('mainPage.gift_cancel')}
          className="h-9 justify-center rounded-xl bg-surface px-3"
        >
          <Text className="text-sm font-semibold text-gift-text" numberOfLines={1}>
            {t('mainPage.cancel')}
          </Text>
        </PressableFeedback>
      </View>
      {items.map((item) => (
        <CartLine key={item.uuid} item={item} onEditNote={onEditNote} />
      ))}
      {!!sticker && (
        <View className="flex-row items-center gap-2">
          <Sticker id={sticker.id} size={26} />
          <Text className="min-w-0 flex-1 text-sm text-muted" numberOfLines={1}>
            “{t(`mainPage.${sticker.labelKey}`)}”
          </Text>
        </View>
      )}
    </View>
  );
};
