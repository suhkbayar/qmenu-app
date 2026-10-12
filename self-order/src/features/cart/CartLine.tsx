import { memo } from 'react';
import { View } from 'react-native';
import { PressableFeedback, useThemeColor } from 'heroui-native';
import { MessageSquarePlus, MessageSquareText, Pencil } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '@/src/lib/format';
import { IOrderItem } from '@/src/types';
import { getCdnImageUrl } from '@/src/lib/image';
import { Image } from '@/src/ui/Image';
import { Stepper } from '@/src/ui/Stepper';
import { Text } from '@/src/ui/Text';
import { useCartStore } from './cartStore';
import { lineTotal } from './totals';

// "Large · Egg · Doneness: Medium"
const details = (item: IOrderItem) =>
  [item.variantName, ...(item.options ?? []).map((o) => (o.value ? `${o.name}: ${o.value}` : o.name))]
    .filter(Boolean)
    .join(' · ');

type Props = {
  item: IOrderItem;
  /** Write or change the line's kitchen note */
  onEditNote?: (item: IOrderItem) => void;
};

/** One line in the order panel: photo, name and line total, chosen options, kitchen note, quantity. */
export const CartLine = memo(({ item, onEditNote }: Props) => {
  const { t } = useTranslation('language');
  const muted = useThemeColor('muted');
  const changeQuantity = useCartStore((s) => s.changeQuantity);
  const info = details(item);

  return (
    <View className="flex-row gap-3">
      <Image
        source={item.image ? { uri: getCdnImageUrl(item.image, 'sm') } : require('@/assets/images/noImage.jpg')}
        className="size-15 rounded-2xl bg-surface-tertiary"
        contentFit="cover"
      />
      <View className="min-w-0 flex-1 gap-0.5">
        <View className="flex-row justify-between gap-2">
          <Text className="flex-1 font-semibold leading-snug" numberOfLines={2}>
            {item.name}
          </Text>
          <Text className="font-bold">{formatMoney(lineTotal(item))}</Text>
        </View>
        {!!info && (
          <Text className="text-sm text-muted" numberOfLines={2}>
            {info}
          </Text>
        )}
        {/* The note, tappable to change it */}
        {!!item.comment && (
          <PressableFeedback
            onPress={() => onEditNote?.(item)}
            isDisabled={!onEditNote}
            accessibilityRole="button"
            accessibilityLabel={t('mainPage.note')}
            className="mt-0.5 flex-row items-start gap-1.5 self-start"
          >
            <MessageSquareText size={16} color={muted} style={{ marginTop: 2 }} />
            <Text className="shrink text-sm italic text-muted" numberOfLines={2}>
              {item.comment}
            </Text>
            {!!onEditNote && <Pencil size={14} color={muted} style={{ marginTop: 3 }} />}
          </PressableFeedback>
        )}
        <View className="mt-1.5 flex-row items-center gap-2">
          <Stepper
            size="sm"
            quantity={item.quantity}
            onIncrease={() => changeQuantity(item.uuid, 1)}
            onDecrease={() => changeQuantity(item.uuid, -1)}
          />
          {!!onEditNote && !item.comment && (
            <PressableFeedback
              onPress={() => onEditNote(item)}
              accessibilityRole="button"
              className="h-10 flex-row items-center gap-1.5 rounded-full px-2.5"
            >
              <MessageSquarePlus size={17} color={muted} />
              <Text className="text-sm font-semibold text-muted" numberOfLines={1}>
                {t('mainPage.note_add')}
              </Text>
            </PressableFeedback>
          )}
        </View>
      </View>
    </View>
  );
});
