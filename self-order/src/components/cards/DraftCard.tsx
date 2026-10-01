import { CURRENCY } from '@/src/constants';
import { IOrderItem } from '@/src/types';
import React, { memo, useCallback, useMemo } from 'react';
import { FlatList, View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, FAB, Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '@/src/store/theme.store';
import { useGiftTheme } from '@/src/hooks/useGiftTheme';

type Props = {
  items: IOrderItem[];
  increase: (uuid: string) => void;
  decrease: (uuid: string) => void;
};

const ITEM_HEIGHT = 132;

const OrderListItem = memo(
  ({ item, onIncrease, onDecrease }: { item: IOrderItem; onIncrease: () => void; onDecrease: () => void }) => {
    const { theme } = useThemeStore();
    const g = useGiftTheme();
    const { t } = useTranslation('language');
    const imageSource = useMemo(
      () => (item.image ? { uri: item.image } : require('../../../assets/images/noImage.jpg')),
      [item.image],
    );
    const formattedPrice = useMemo(() => `${item.price.toLocaleString()} ${CURRENCY}`, [item.price]);

    return (
      <View
        style={[styles.item, { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.shadow }]}
      >
        <Image
          source={imageSource}
          style={styles.image}
          defaultSource={require('../../../assets/images/noImage.jpg')}
        />
        <View style={styles.info}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
            {item.name}
          </Text>

          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: theme.primary }]}>{formattedPrice}</Text>

            {/* Read-only: gifts are set from the header flow, not from this list. */}
            {!!item.giftToTableId && (
              <View style={[styles.giftTag, { backgroundColor: g.gold + '1f', borderColor: g.gold + '66' }]}>
                <Icon source="gift" size={15} color={g.goldText} />
                <Text style={[styles.giftTagText, { color: g.goldText }]} numberOfLines={1}>
                  {item.giftToTableName
                    ? t('mainPage.gift_tag_to', {
                        table: item.giftToTableName,
                        defaultValue: `To ${item.giftToTableName}`,
                      })
                    : t('mainPage.gift_item', 'Gift')}
                </Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.controls}>
          <TouchableOpacity activeOpacity={10} onPress={onDecrease}>
            <FAB
              animated={false}
              icon="minus"
              size="small"
              style={[styles.fabOutline, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
              color={theme.primary}
            />
          </TouchableOpacity>
          <Text style={[styles.qty, { color: theme.text }]}>{item.quantity}</Text>
          <TouchableOpacity activeOpacity={10} onPress={onIncrease}>
            <FAB
              animated={false}
              icon="plus"
              size="small"
              style={[styles.fab, { backgroundColor: theme.primary }]}
              color="white"
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  },
);

const DraftList = ({ items, increase, decrease }: Props) => {
  const keyExtractor = useCallback((item: IOrderItem) => item.uuid, []);

  const renderItem = useCallback(
    ({ item }: { item: IOrderItem }) => (
      <OrderListItem item={item} onIncrease={() => increase(item.uuid)} onDecrease={() => decrease(item.uuid)} />
    ),
    [increase, decrease],
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index }),
    [],
  );

  return (
    <FlatList
      data={items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      getItemLayout={getItemLayout}
      initialNumToRender={8}
      maxToRenderPerBatch={5}
      windowSize={5}
      removeClippedSubviews
      contentContainerStyle={styles.list}
    />
  );
};

const styles = StyleSheet.create({
  list: { paddingVertical: 4 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  image: { width: 88, height: 88, borderRadius: 12, marginRight: 16 },
  info: { flex: 1, gap: 6 },
  name: { fontWeight: '700', fontSize: 19, lineHeight: 24 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  giftTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
    flexShrink: 1,
  },
  giftTagText: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  price: { fontSize: 18, fontWeight: '700' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  qty: { fontSize: 20, fontWeight: '800', minWidth: 28, textAlign: 'center' },
  fabOutline: {
    width: 54,
    height: 54,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default memo(DraftList);
