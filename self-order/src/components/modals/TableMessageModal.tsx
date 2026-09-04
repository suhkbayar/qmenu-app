import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Icon } from 'react-native-paper';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  SectionList,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLazyQuery } from '@apollo/client';
import { Toast } from 'react-native-toast-notifications';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useOrderStore, IGiftTarget } from '@/src/store/order.store';
import { useCallStore } from '@/src/store/cart.store';
import { GET_ACTIVE_TABLES } from '@/src/graphql/queries/tableMessage';
import { SEND_TABLE_MESSAGE } from '@/src/graphql/mutations/tableMessage';
import { SEND_TABLE_REQUEST } from '@/src/graphql/mutations/tableRequest';
import { CURRENCY, MenuItemState, TABLE_MESSAGE_STICKERS, TableMessageSticker } from '@/src/constants';
import { useGiftTheme } from '@/src/hooks/useGiftTheme';
import { ITable } from '@/src/types/table';
import { IMenuCategory, IMenuProduct } from '@/src/types';
import { IOrderItem } from '@/src/types/order';
import { getPayload } from '@/src/providers/auth';
import apolloClient from '@/src/providers/apolloClient';
import { isCurrentlyOpen } from '@/src/utils';
import TableFloorPlanPicker from '@/src/components/TableFloorPlanPicker';
import AnimatedEmoji from '@/src/components/ui/AnimatedEmoji';
import ProductDetailsScreen from '@/app/private/product-info';
import SitConfirmModal from '@/src/components/modals/SitConfirmModal';
import Medallion from '@/src/components/ui/Medallion';

export type TableMessageMode = 'order' | 'item' | 'message' | 'sit';

type Props = {
  visible: boolean;
  onClose: () => void;
  mode?: TableMessageMode;
  target?: IGiftTarget | null;
  replyToGiftId?: string | null;
};

type Step = 'table' | 'gift' | 'card';

type GiftSection = { title: string; data: IMenuProduct[][] };

const buildGiftSections = (categories: IMenuCategory[] = []): GiftSection[] => {
  const sections: GiftSection[] = [];
  const seen = new Set<string>();

  const walk = (cats: IMenuCategory[]) => {
    for (const cat of cats) {
      if (!isCurrentlyOpen(cat.timetable)) continue;

      const products = (cat.products ?? []).filter((product) => {
        if (product.state === MenuItemState.INACTIVE || !product.variants?.length) return false;
        if (seen.has(product.productId)) return false;

        seen.add(product.productId);
        return true;
      });

      if (products.length) sections.push({ title: cat.name, data: [products] });
      if (cat.children?.length) walk(cat.children);
    }
  };

  walk(categories);
  return sections;
};

const TableMessageModal = ({ visible, onClose, mode = 'item', target = null, replyToGiftId = null }: Props) => {
  const { t } = useTranslation('language');
  const g = useGiftTheme();

  const toast = Toast;
  const participant = useCallStore((s) => s.participant);
  const setGiftTarget = useOrderStore((s) => s.setGiftTarget);
  const setGiftSticker = useOrderStore((s) => s.setGiftSticker);
  const giftAnonymous = useOrderStore((s) => s.giftAnonymous);
  const setGiftAnonymous = useOrderStore((s) => s.setGiftAnonymous);
  const addGiftItem = useOrderStore((s) => s.addGiftItem);
  const addGiftOrderItem = useOrderStore((s) => s.addGiftOrderItem);

  const isReply = !!target;

  const steps: Step[] = useMemo(() => {
    if (mode === 'order') return ['table', 'gift', 'card'];
    if (mode === 'item') return ['table', 'card'];
    if (mode === 'sit') return ['table'];
    return isReply ? ['card'] : ['table', 'card'];
  }, [mode, isReply]);

  const [step, setStep] = useState<Step>(steps[0]);
  const [selectedTable, setSelectedTable] = useState<IGiftTarget | null>(target);
  const [selectedProduct, setSelectedProduct] = useState<IMenuProduct | null>(null);
  // Products with a choice to make are configured through the same screen the
  // home page uses, and come back as a ready-built order item.
  const [configuring, setConfiguring] = useState<IMenuProduct | null>(null);
  const [configuredItem, setConfiguredItem] = useState<IOrderItem | null>(null);
  const [pendingSitTable, setPendingSitTable] = useState<ITable | null>(null);
  const [sitSending, setSitSending] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [ownTableId, setOwnTableId] = useState<string | null>(null);

  const [loadTables, { data, loading }] = useLazyQuery(GET_ACTIVE_TABLES, { fetchPolicy: 'network-only' });

  const reportFailure = useCallback(
    (error: any) => toast.show(error?.message, { type: 'danger', placement: 'top', duration: 4000 }),
    [toast],
  );

  useEffect(() => {
    if (!visible) return;
    setStep(steps[0]);
    setSelectedTable(target);
    setSelectedProduct(null);
    setConfiguring(null);
    setConfiguredItem(null);
    setPendingSitTable(null);
    setSitSending(false);
    setQuantity(1);
    if (steps[0] === 'table') loadTables();
    getPayload().then((payload) => setOwnTableId(payload?.table ?? null));
  }, [visible, steps, target]);

  const giftSections = useMemo<GiftSection[]>(
    () => (mode === 'order' ? buildGiftSections(participant?.menu?.categories) : []),
    [mode, participant?.menu?.categories],
  );

  const goNext = useCallback(() => {
    const i = steps.indexOf(step);
    if (i < steps.length - 1) setStep(steps[i + 1]);
  }, [step, steps]);

  const goBack = useCallback(() => {
    const i = steps.indexOf(step);
    if (i > 0) setStep(steps[i - 1]);
  }, [step, steps]);

  // Tapping a table only stages it — an invitation to a stranger's table is not
  // something a mistap on the floor plan should be able to send.
  const pickTable = useCallback(
    (table: ITable) => {
      if (mode === 'sit') {
        setPendingSitTable(table);
        return;
      }

      setSelectedTable({ id: table.id, name: table.name });
      goNext();
    },
    [mode, goNext],
  );

  const sendSitRequest = useCallback(
    async (table: ITable) => {
      if (sitSending) return;
      setSitSending(true);

      try {
        const res = await apolloClient.mutate({
          mutation: SEND_TABLE_REQUEST,
          variables: { input: { toTableId: table.id } },
        });
        if (res?.data?.sendTableRequest) {
          toast.show(t('mainPage.sit_sent', { table: table.name, defaultValue: `Invitation sent to ${table.name}` }), {
            type: 'success',
            placement: 'top',
            duration: 3000,
          });
        }
      } catch (error: any) {
        reportFailure(error);
      } finally {
        setSitSending(false);
        setPendingSitTable(null);
        onClose();
      }
    },
    [sitSending, onClose, toast, t, reportFailure],
  );

  // Same rule as ProductCard on the home page: more than one variant, or any
  // options on the only variant, means the guest has to choose.
  const pickProduct = useCallback(
    (product: IMenuProduct) => {
      const variants = product.variants ?? [];
      if (variants.length > 1 || (variants[0]?.options?.length ?? 0) > 0) {
        setConfiguring(product);
        return;
      }

      setSelectedProduct(product);
      setConfiguredItem(null);
      setQuantity(1);
      goNext();
    },
    [goNext],
  );

  const applyConfigured = useCallback(
    (item: IOrderItem) => {
      setSelectedProduct(configuring);
      setConfiguredItem(item);
      setQuantity(item.quantity || 1);
      setConfiguring(null);
      goNext();
    },
    [configuring, goNext],
  );

  const confirm = useCallback(
    async (sticker: TableMessageSticker | null) => {
      if (!selectedTable) return;
      if (mode === 'message') {
        if (!sticker) return;
        const to = selectedTable;

        try {
          const res = await apolloClient.mutate({
            mutation: SEND_TABLE_MESSAGE,
            variables: {
              input: { toTableId: to.id, stickerId: sticker.id, giftId: replyToGiftId ?? undefined },
            },
          });
          if (res?.data?.sendTableMessage) {
            toast.show(t('mainPage.message_sent', { table: to.name, defaultValue: `Sent to Table ${to.name}` }), {
              type: 'success',
              placement: 'top',
              duration: 3000,
            });
          }
        } catch (error: any) {
          reportFailure(error);
        } finally {
          onClose();
        }
        return;
      }

      setGiftTarget(selectedTable);
      setGiftSticker(sticker?.id ?? null);

      if (mode === 'order' && selectedProduct) {
        if (configuredItem) addGiftOrderItem({ ...configuredItem, quantity }, selectedTable);
        else addGiftItem(selectedProduct, quantity, selectedTable);
        onClose();
        router.push('/private/draft-order');
        return;
      }

      onClose();
    },
    [
      selectedTable,
      mode,
      selectedProduct,
      configuredItem,
      quantity,
      replyToGiftId,
      toast,
      reportFailure,
      setGiftTarget,
      setGiftSticker,
      addGiftItem,
      addGiftOrderItem,
      onClose,
      t,
    ],
  );

  const tables: ITable[] = data?.getActiveTables ?? [];
  const stepIndex = steps.indexOf(step);

  const deck = useMemo(
    () => TABLE_MESSAGE_STICKERS.filter((s) => s.tone === (isReply ? 'REPLY' : 'OPENER')),
    [isReply],
  );

  // The configured item carries the chosen variant's price plus its options;
  // fall back to the sole variant for products that needed no choice.
  const unitPrice = configuredItem
    ? configuredItem.price + (configuredItem.options?.reduce((sum, o: any) => sum + (o.price || 0), 0) ?? 0)
    : (selectedProduct?.variants?.[0]?.salePrice ?? 0);

  const isSit = mode === 'sit';

  const headerGlyph = isSit ? 'account-multiple' : mode === 'message' || isReply ? 'email-outline' : 'gift-outline';

  const title = isSit
    ? t('mainPage.sit_picker_title', 'Who would you like to sit with?')
    : isReply
      ? t('mainPage.reply_title', { table: selectedTable?.name, defaultValue: `Reply to ${selectedTable?.name}` })
      : step === 'table'
        ? t(mode === 'message' ? 'mainPage.message_picker_title' : 'mainPage.gift_picker_title')
        : step === 'gift'
          ? t('mainPage.gift_choose_title', 'What are you sending?')
          : t('mainPage.gift_message_title');

  const subtitle = isSit
    ? t('mainPage.sit_picker_subtitle', 'They can accept or decline')
    : step === 'table'
      ? t(mode === 'message' ? 'mainPage.message_picker_subtitle' : 'mainPage.gift_picker_subtitle')
      : step === 'gift'
        ? t('mainPage.gift_choose_subtitle', 'Their table gets it delivered by a waiter')
        : t(mode === 'message' ? 'mainPage.message_sticker_subtitle' : 'mainPage.gift_sticker_subtitle');

  return (
    <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modal}>
      <View style={[styles.card, { backgroundColor: g.surface, borderColor: g.hairline }]}>
        <View style={[styles.header, { backgroundColor: g.raised, borderBottomColor: g.hairline }]}>
          <View style={styles.headerBar}>
            {stepIndex > 0 ? (
              <TouchableOpacity onPress={goBack} style={styles.navButton} hitSlop={HIT}>
                <Icon source="chevron-left" size={26} color={g.textSoft} />
              </TouchableOpacity>
            ) : (
              <View style={styles.navButton} />
            )}

            <TouchableOpacity onPress={onClose} style={styles.navButton} hitSlop={HIT}>
              <Icon source="close" size={22} color={g.textSoft} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.title, { color: g.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: g.textSoft }]}>{subtitle}</Text>

          {steps.length > 1 && (
            <View style={styles.trail}>
              {steps.map((s, i) => (
                <React.Fragment key={s}>
                  {i > 0 && (
                    <View style={[styles.trailLine, { backgroundColor: i <= stepIndex ? g.gold : g.hairline }]} />
                  )}
                  <View
                    style={[
                      styles.trailDot,
                      { borderColor: i <= stepIndex ? g.gold : g.hairline },
                      i <= stepIndex && { backgroundColor: g.gold },
                    ]}
                  >
                    <Text style={[styles.trailNum, { color: i <= stepIndex ? g.onGold : g.textFaint }]}>{i + 1}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          )}

          {selectedTable && step !== 'table' && !isReply && (
            <View style={styles.route}>
              <Text style={[styles.routeFrom, { color: g.textFaint }]}>{t('mainPage.legend_you', 'Your table')}</Text>
              <Icon source="arrow-right-thin" size={18} color={g.goldText} />
              <Text style={[styles.routeTo, { color: g.goldText }]}>{selectedTable.name}</Text>
              {selectedProduct && step === 'card' && (
                <>
                  <Icon source="arrow-right-thin" size={18} color={g.goldText} />
                  <Text style={[styles.routeTo, { color: g.goldText }]} numberOfLines={1}>
                    {quantity}× {configuredItem?.name ?? selectedProduct.name}
                  </Text>
                </>
              )}
            </View>
          )}
        </View>

        <View style={styles.body}>
          {step === 'table' &&
            (loading ? (
              <ActivityIndicator animating size="large" color={g.goldText} style={styles.loader} />
            ) : tables.length === 0 ? (
              <Text style={[styles.empty, { color: g.textSoft }]}>
                {t('mainPage.no_other_tables', 'No other tables available')}
              </Text>
            ) : (
              <TableFloorPlanPicker tables={tables} ownTableId={ownTableId} onSelect={pickTable} />
            ))}

          {step === 'gift' && (
            <SectionList
              sections={giftSections}
              keyExtractor={(_row, index) => `gift-row-${index}`}
              stickySectionHeadersEnabled={false}
              showsVerticalScrollIndicator={false}
              style={styles.giftListWrap}
              contentContainerStyle={styles.giftList}
              initialNumToRender={3}
              windowSize={5}
              ListEmptyComponent={<Text style={[styles.empty, { color: g.textSoft }]}>{t('mainPage.noItems')}</Text>}
              renderSectionHeader={({ section }) => (
                <Text style={[styles.giftSectionTitle, { color: g.textSoft }]}>{section.title}</Text>
              )}
              renderItem={({ item: row }) => (
                <View style={styles.giftGrid}>
                  {row.map((product) => (
                    <TouchableOpacity
                      key={product.productId}
                      style={[styles.giftCard, { backgroundColor: g.raised, borderColor: g.hairline }]}
                      onPress={() => pickProduct(product)}
                      activeOpacity={0.8}
                    >
                      {product.image ? (
                        <Image source={{ uri: product.image }} style={styles.giftImage} />
                      ) : (
                        <View style={[styles.giftImage, styles.giftImageEmpty, { backgroundColor: g.gold + '1f' }]}>
                          <Icon source="silverware-fork-knife" size={34} color={g.goldText} />
                        </View>
                      )}

                      <Text style={[styles.giftName, { color: g.text }]} numberOfLines={2}>
                        {product.name}
                      </Text>
                      <Text style={[styles.giftPrice, { color: g.goldText }]}>
                        {(product.variants?.[0]?.salePrice ?? 0).toLocaleString()} {CURRENCY}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />
          )}

          {step === 'card' && selectedTable && (
            <ScrollView contentContainerStyle={styles.deck} showsVerticalScrollIndicator={false}>
              {mode === 'order' && selectedProduct && (
                <View style={[styles.qtyBar, { backgroundColor: g.raised, borderColor: g.hairline }]}>
                  <Text style={[styles.qtyLabel, { color: g.textSoft }]}>{t('mainPage.gift_qty_question')}</Text>
                  <View style={styles.qtyControls}>
                    <TouchableOpacity
                      onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      style={[styles.qtyBtn, { borderColor: g.hairline, opacity: quantity <= 1 ? 0.4 : 1 }]}
                    >
                      <Icon source="minus" size={22} color={g.text} />
                    </TouchableOpacity>
                    <Text style={[styles.qtyValue, { color: g.text }]}>{quantity}</Text>
                    <TouchableOpacity
                      onPress={() => setQuantity((q) => Math.min(20, q + 1))}
                      style={[styles.qtyBtn, { borderColor: g.hairline }]}
                    >
                      <Icon source="plus" size={22} color={g.text} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.qtyTotal, { color: g.goldText }]}>
                    {(unitPrice * quantity).toLocaleString()} {CURRENCY}
                  </Text>
                </View>
              )}

              {mode !== 'message' && (
                <TouchableOpacity
                  onPress={() => setGiftAnonymous(!giftAnonymous)}
                  activeOpacity={0.8}
                  style={[
                    styles.anonRow,
                    { borderColor: giftAnonymous ? g.gold : g.hairline, backgroundColor: g.raised },
                  ]}
                >
                  <Icon
                    source={giftAnonymous ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={26}
                    color={giftAnonymous ? g.gold : g.textFaint}
                  />
                  <View style={styles.anonText}>
                    <Text style={[styles.anonTitle, { color: g.text }]}>
                      {t('mainPage.gift_anonymous', 'Hide my table')}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              <View style={styles.grid}>
                {mode !== 'message' && (
                  <Animated.View entering={FadeInDown.duration(340)}>
                    <TouchableOpacity
                      style={[styles.tile, { backgroundColor: g.raised, borderColor: g.hairline }]}
                      onPress={() => confirm(null)}
                      activeOpacity={0.75}
                    >
                      <Icon source="send-outline" size={52} color={g.goldText} />
                      <Text style={[styles.tileLabel, { color: g.text }]} numberOfLines={3}>
                        {t('mainPage.skip_gift_message', 'Send without a message')}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                )}

                {deck.map((sticker, i) => (
                  <Animated.View key={sticker.id} entering={FadeInDown.delay(i * 55).duration(340)}>
                    <TouchableOpacity
                      style={[styles.tile, { backgroundColor: g.raised, borderColor: g.hairline }]}
                      onPress={() => confirm(sticker)}
                      activeOpacity={0.75}
                    >
                      <AnimatedEmoji emoji={sticker.emoji} anim={sticker.anim} size={52} delay={i * 130} />
                      <Text style={[styles.tileLabel, { color: g.text }]} numberOfLines={3}>
                        {t(`mainPage.${sticker.labelKey}`)}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
      <SitConfirmModal
        table={pendingSitTable}
        sending={sitSending}
        onCancel={() => setPendingSitTable(null)}
        onConfirm={sendSitRequest}
      />

      {!!configuring && (
        <ProductDetailsScreen
          visible
          product={configuring}
          onClose={() => setConfiguring(null)}
          onConfigured={applyConfigured}
        />
      )}
    </Modal>
  );
};

export default TableMessageModal;

const HIT = { top: 12, bottom: 12, left: 12, right: 12 };

const styles = StyleSheet.create({
  modal: { justifyContent: 'center', alignItems: 'center' },
  card: {
    width: Dimensions.get('window').width * 0.82,
    maxWidth: 880,
    maxHeight: Dimensions.get('window').height * 0.9,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
  },
  goldRule: { height: 4 },

  header: { paddingHorizontal: 26, paddingTop: 12, paddingBottom: 26, borderBottomWidth: 1 },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  crest: { alignItems: 'center', marginTop: 2 },
  title: { fontSize: 34, fontWeight: '800', textAlign: 'center', marginTop: 16, lineHeight: 42 },
  subtitle: { fontSize: 18, textAlign: 'center', marginTop: 9, paddingHorizontal: 20, lineHeight: 25 },

  trail: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  trailDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trailNum: { fontSize: 12, fontWeight: '800' },
  trailLine: { width: 44, height: 1.5 },

  route: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 },
  routeFrom: { fontSize: 13, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  routeTo: { fontSize: 15, fontWeight: '800', maxWidth: 220 },

  body: { flexShrink: 1, paddingHorizontal: 26, paddingBottom: 22, paddingTop: 18 },
  loader: { marginTop: 30 },
  empty: { marginTop: 30, fontSize: 19, textAlign: 'center', width: '100%' },

  giftListWrap: { maxHeight: Dimensions.get('window').height * 0.52 },
  giftList: { paddingBottom: 4 },
  giftSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginTop: 18,
    marginBottom: 10,
  },
  giftGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'flex-start' },
  giftCard: { width: 186, borderRadius: 16, borderWidth: 1, padding: 10, paddingBottom: 14 },
  giftImage: { width: '100%', height: 116, borderRadius: 11 },
  giftImageEmpty: { alignItems: 'center', justifyContent: 'center' },
  giftName: { fontSize: 16, fontWeight: '700', marginTop: 10, lineHeight: 21 },
  giftPrice: { fontSize: 17, fontWeight: '800', marginTop: 6 },

  deck: { paddingBottom: 4 },
  qtyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginBottom: 22,
  },
  qtyLabel: { fontSize: 15, fontWeight: '600', flex: 1 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  qtyBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: { fontSize: 22, fontWeight: '800', minWidth: 28, textAlign: 'center' },
  qtyTotal: { fontSize: 19, fontWeight: '800', minWidth: 120, textAlign: 'right' },

  anonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  anonText: { flex: 1 },
  anonTitle: { fontSize: 17, fontWeight: '700' },
  anonHint: { fontSize: 14, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center', marginBottom: 20 },
  tile: {
    width: 226,
    minHeight: 176,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  tileLabel: {
    alignSelf: 'stretch',
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 23,
    textAlign: 'center',
  },
});
