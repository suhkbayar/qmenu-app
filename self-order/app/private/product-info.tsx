import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { FAB, Icon } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useLazyQuery } from '@apollo/client';
import { isEmpty } from 'lodash';
import RenderHtml from 'react-native-render-html';

import OptionValuesModal from '@/src/components/modals/OptionValuesModal';
import RecommendedCard from '@/src/components/cards/RecommendedCard';
import { defaultColor } from '@/src/constants/Colors';
import { CURRENCY } from '@/src/constants';
import { GET_CROSS_SELLS } from '@/src/graphql/queries/product';
import { useCallStore } from '@/src/store/cart.store';
import { useOrderStore } from '@/src/store/order.store';
import { IMenuOption, IMenuVariant, IOrderItem } from '@/src/types';
import { calculateOrderItem, generateUUID } from '@/src/utils';

interface Props {
  visible?: boolean;
  onClose?: () => void;
  product?: any;
}

const calculateTotals = (items: IOrderItem[]) => {
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalAmount = items.reduce((sum, i) => {
    const optTotal = i.options?.reduce((s, o) => s + (o.price || 0), 0) ?? 0;
    return sum + (i.price + optTotal) * i.quantity;
  }, 0);
  return { totalAmount, grandTotal: totalAmount, totalQuantity };
};

const ProductDetails: React.FC<Props> = ({ visible = true, onClose, product: propProduct }) => {
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const { t } = useTranslation('language');
  const { participant } = useCallStore();
  const orderState = useOrderStore((s) => s.orderState);
  const setOrderState = useOrderStore((s) => s.setOrderState);

  const [isExpanded, setIsExpanded] = useState(false);
  const [visibleValues, setVisibleValues] = useState(false);
  const [selectedOption, setSelectedOption] = useState<IMenuOption | null>(null);
  const [validationError, setValidationError] = useState('');
  const [validateOptions, setValidateOptions] = useState<IMenuOption[]>([]);
  const [selectedItem, setSelectedItem] = useState<IOrderItem | null>(null);

  const [getCrossSells, { data: cross }] = useLazyQuery(GET_CROSS_SELLS);

  const product = useMemo(() => {
    if (propProduct) return propProduct;
    try {
      return JSON.parse(params.product as string);
    } catch {
      return null;
    }
  }, [propProduct, params.product]);

  const currentVariant = useMemo(
    () => product?.variants?.find((v: IMenuVariant) => v.id === selectedItem?.id) ?? null,
    [product, selectedItem?.id],
  );

  useEffect(() => {
    if (!product?.variants?.[0]) {
      setSelectedItem(null);
      return;
    }
    const v = product.variants[0];
    setSelectedItem({
      id: v.id,
      uuid: generateUUID(),
      productId: product.productId,
      name: v.name,
      reason: '',
      state: 'DRAFT',
      quantity: 1,
      options: [],
      price: v.salePrice,
      discount: 0,
      comment: '',
      image: product.image ?? '',
    });
    setValidationError('');
    if (participant?.menu?.id) {
      getCrossSells({ variables: { menuId: participant.menu.id, ids: [product.productId] } });
    }
  }, [product]);

  const handleSelectOption = useCallback((option: IMenuOption & { value?: string }) => {
    setSelectedItem((prev) => {
      if (!prev) return prev;
      const already = prev.options.some((o) => o.id === option.id);
      return { ...prev, options: already ? prev.options.filter((o) => o.id !== option.id) : [...prev.options, option] };
    });
    setValidationError('');
  }, []);

  const toggleOption = useCallback(
    (option: IMenuOption, value?: string) => {
      setValidateOptions([]);
      if (!isEmpty(option.values) && isEmpty(value)) {
        setSelectedOption(option);
        setVisibleValues(true);
      } else {
        handleSelectOption(option);
      }
    },
    [handleSelectOption],
  );

  const onSelect = useCallback(
    (variant: IMenuVariant) => {
      if (!selectedItem || !product) return;
      if (selectedItem.id === variant.id) {
        setSelectedItem({ ...selectedItem, quantity: selectedItem.quantity + 1 });
      } else {
        setSelectedItem({
          id: variant.id,
          uuid: generateUUID(),
          productId: product.productId,
          name: variant.name,
          reason: '',
          state: 'DRAFT',
          quantity: 1,
          options: [],
          price: variant.salePrice,
          discount: 0,
          image: product.image ?? '',
          comment: '',
        });
      }
      setValidationError('');
      setValidateOptions([]);
    },
    [selectedItem, product],
  );

  const onRemove = useCallback(() => {
    if (!selectedItem || selectedItem.quantity <= 1) return;
    setSelectedItem({ ...selectedItem, quantity: selectedItem.quantity - 1 });
  }, [selectedItem]);

  const onSelectValue = useCallback(
    (value: string) => {
      if (!selectedOption) return;
      setVisibleValues(false);
      handleSelectOption({ ...selectedOption, value });
    },
    [selectedOption, handleSelectOption],
  );

  const goBack = useCallback(() => {
    setSelectedOption(null);
    setValidationError('');
    setSelectedItem(null);
    setValidateOptions([]);
    if (onClose) onClose();
    else router.back();
  }, [onClose]);

  const addToCart = useCallback(
    (variant: { id: string; name?: string; price?: number }, productId: string) => {
      const cp = cross?.getCrossSells?.find((p: any) => p.productId === productId);
      const newItem: IOrderItem = {
        id: variant.id,
        uuid: `${variant.id}-${Date.now()}`,
        productId,
        name: variant.name || cp?.name || '',
        price: variant.price || 0,
        quantity: 1,
        comment: '',
        options: [],
        discount: 0,
        state: '',
        image: cp?.image,
        reason: '',
      };
      setOrderState((prev) => {
        const idx = prev.items.findIndex((i) => i.id === variant.id);
        const updated =
          idx >= 0
            ? prev.items.map((i, n) => (n === idx ? { ...i, quantity: i.quantity + 1 } : i))
            : [...prev.items, newItem];
        return { ...prev, items: updated, ...calculateTotals(updated) };
      });
    },
    [setOrderState, cross?.getCrossSells],
  );

  const removeFromCart = useCallback(
    (productId: string) => {
      setOrderState((prev) => {
        const idx = prev.items.findIndex((i) => i.productId === productId);
        if (idx < 0) return prev;
        const existing = prev.items[idx];
        const updated =
          existing.quantity > 1
            ? prev.items.map((i, n) => (n === idx ? { ...i, quantity: i.quantity - 1 } : i))
            : prev.items.filter((_, n) => n !== idx);
        return { ...prev, items: updated, ...calculateTotals(updated) };
      });
    },
    [setOrderState],
  );

  const addItem = useCallback(() => {
    if (!selectedItem) return;
    const variant = product?.variants?.find((v: IMenuVariant) => v.id === selectedItem.id);
    const mandatory = variant?.options?.filter((o: IMenuOption) => o.mandatory) || [];
    const selected = new Set(selectedItem.options.map((o) => o.id));
    const missing = mandatory.filter((o: IMenuOption) => !selected.has(o.id));

    if (missing.length > 0) {
      setValidateOptions(missing);
      setValidationError(
        t('mainPage.validation.mandatoryOptions', { options: missing.map((o: IMenuOption) => o.name).join(', ') }),
      );
      return;
    }

    setOrderState((prev) => {
      const items = [...prev.items, selectedItem];
      return { items, ...calculateTotals(items), state: 'DRAFT' };
    });

    goBack();
  }, [selectedItem, product, t, setOrderState, goBack]);

  const crossSells = cross?.getCrossSells?.slice(0, 3) ?? [];
  const htmlSource = useMemo(
    () => (product?.specification ? { html: product.specification } : null),
    [product?.specification],
  );
  const priceDisplay = useMemo(
    () => (selectedItem ? calculateOrderItem(selectedItem) + CURRENCY : '0' + CURRENCY),
    [selectedItem],
  );

  const content = (
    <View style={styles.page}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Icon source="arrow-left" size={24} color="#333" />
          <Text style={styles.backText}>{t('mainPage.GoBack')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.leftCol}>
          <Image
            source={{ uri: product?.image?.replace('/sm', '/md') }}
            style={styles.productImage}
            resizeMode="cover"
          />
          {!isEmpty(crossSells) && (
            <View style={styles.crossSection}>
              <Text style={styles.crossTitle}>{t('mainPage.recommendedForYou')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.crossScroll}>
                {crossSells.map((p: any) => (
                  <View key={p.id} style={styles.crossCard}>
                    <RecommendedCard
                      isFullWidth
                      product={p}
                      orderItem={orderState.items?.find((i) => i.productId === p.productId)}
                      onAdd={addToCart}
                      onRemove={removeFromCart}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <ScrollView style={styles.rightCol} contentContainerStyle={styles.rightContent}>
          <Text style={styles.title}>{product?.name}</Text>

          {htmlSource && (
            <View style={styles.specContainer}>
              <View style={!isExpanded ? styles.htmlClamp : undefined}>
                <RenderHtml contentWidth={width} source={htmlSource} />
              </View>
              <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}>
                <Text style={styles.expandToggle}>{isExpanded ? 'Хураах' : 'Илүү их'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Variants */}
          {product?.variants?.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>{t('mainPage.Variants')}</Text>
              <Text style={styles.sectionDesc}>{t('mainPage.chooseOption')}</Text>
              <View style={styles.chipRow}>
                {product.variants.map((v: IMenuVariant) => (
                  <TouchableOpacity
                    key={v.id}
                    onPress={() => onSelect(v)}
                    style={[styles.chip, selectedItem?.id === v.id && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, selectedItem?.id === v.id && styles.chipTextActive]}>{v.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Options */}
          {currentVariant && !isEmpty(currentVariant.options) && (
            <>
              <Text style={styles.sectionTitle}>{t('mainPage.extra')}</Text>
              <Text style={[styles.sectionDesc, validationError ? styles.errorDesc : undefined]}>
                {validationError ? 'Шаардлагатай сонголтуудыг сонгоно уу' : t('mainPage.chooseIngredients')}
              </Text>
              <View style={styles.chipRow}>
                {currentVariant.options.map((opt: IMenuOption) => {
                  const isSelected = selectedItem?.options.some((o) => o.id === opt.id);
                  const needsValidation = validateOptions.some((o) => o.id === opt.id);
                  const selectedValue = selectedItem?.options.find((o) => o.id === opt.id)?.value;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      onPress={() => toggleOption(opt, selectedValue)}
                      style={[styles.chip, needsValidation ? styles.chipError : isSelected && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, (needsValidation || isSelected) && styles.chipTextActive]}>
                        {opt.name}
                        {!isEmpty(selectedValue) && `: ${selectedValue}`}
                      </Text>
                      {opt.mandatory && (
                        <Text style={{ marginLeft: 4, color: needsValidation ? 'white' : 'red' }}>*</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          <View style={styles.priceRow}>
            <Text style={styles.price}>{priceDisplay}</Text>
            <View style={styles.qtyRow}>
              <TouchableOpacity onPress={onRemove}>
                <FAB animated={false} icon="minus" size="small" style={styles.fabOutline} color={defaultColor} />
              </TouchableOpacity>
              <Text style={styles.qty}>{selectedItem?.quantity || 0}</Text>
              <TouchableOpacity onPress={() => currentVariant && onSelect(currentVariant)}>
                <FAB animated={false} icon="plus" size="small" style={styles.fabFill} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.addBtn} onPress={addItem}>
            <Text style={styles.addBtnText}>{t('mainPage.AddToCard')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <OptionValuesModal
        visible={visibleValues}
        values={selectedOption?.values ?? []}
        onClose={() => setVisibleValues(false)}
        onSelectValue={onSelectValue}
      />
    </View>
  );

  if (!visible) return null;
  if (onClose)
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
        {content}
      </Modal>
    );
  return content;
};

export default ProductDetails;

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 24 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 20 },
  backButton: { flexDirection: 'row', alignItems: 'center', padding: 8, gap: 8 },
  backText: { fontSize: 16, color: '#333', fontWeight: '600' },
  content: { flexDirection: 'row', gap: 16, height: '100%', marginBottom: 24 },
  leftCol: { flex: 1, height: '100%', justifyContent: 'flex-start' },
  rightCol: { flex: 1, alignSelf: 'flex-start', marginTop: 50 },
  rightContent: { padding: 18 },
  productImage: { height: 400, width: '100%', borderRadius: 16, marginBottom: 16, marginTop: 26 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  specContainer: { marginBottom: 16 },
  htmlClamp: { maxHeight: 80, overflow: 'hidden' },
  expandToggle: { color: '#007BFF', fontWeight: '600', marginTop: 8 },
  sectionTitle: { fontWeight: '600', fontSize: 16 },
  sectionDesc: { color: '#6b7280', fontSize: 13, marginBottom: 16 },
  errorDesc: { color: 'red' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
    marginRight: 8,
    flexDirection: 'row',
  },
  chipActive: { backgroundColor: defaultColor },
  chipError: { backgroundColor: 'red' },
  chipText: { fontWeight: '600', fontSize: 14 },
  chipTextActive: { color: 'white' },
  crossSection: { marginTop: 10, flex: 1 },
  crossTitle: { fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 12 },
  crossScroll: {},
  crossCard: { borderRadius: 12, marginRight: 12 },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 14,
  },
  price: { fontSize: 24, fontWeight: '700' },
  qtyRow: { flexDirection: 'row', alignItems: 'center' },
  qty: { fontSize: 20, marginHorizontal: 12 },
  fabFill: {
    backgroundColor: defaultColor,
    width: 56,
    height: 56,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabOutline: {
    backgroundColor: 'white',
    width: 56,
    height: 56,
    borderRadius: 999,
    borderColor: '#f0f0f0',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtn: {
    backgroundColor: defaultColor,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  addBtnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
