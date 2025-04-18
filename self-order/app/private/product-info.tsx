import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Badge, FAB, Icon } from 'react-native-paper';
import { defaultColor } from '@/constants/Colors';
import { ICustomerOrder, IMenuOption, IMenuVariant, IOrderItem } from '@/types';
import { isEmpty } from 'lodash';
import { useDraw } from '@/providers/drawerProvider';
import { useOrder } from '@/providers/OrderProvider';
import DraftOrder from '@/components/DraftOrder';
import RenderHtml from 'react-native-render-html';
import { LogBox } from 'react-native';
import { CURRENCY } from '@/constants';
import { calculateOrderItem, generateUUID } from '@/utils';
import OptionValuesModal from '@/components/Modal/OptionValuesModal';
interface ValidationResult {
  isValid: boolean;
  missingMandatoryOptions: IMenuOption[];
  productId: string | null;
}

const ProductDetailsScreen = () => {
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const { t } = useTranslation('language');
  const { orderState, setOrderState } = useOrder();
  const [isExpanded, setIsExpanded] = useState(false);
  const { drawerVisible, setDrawerVisible } = useDraw();
  const [visibleValues, setVisibleValues] = useState(false);
  const [selectedOptoin, setSelectedOption] = useState<any>(null);
  const [validationError, setValidationError] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<IOrderItem | null>();
  const [validateOptions, setValidateOptions] = useState<IMenuOption[]>([]);
  const product = params.product ? JSON.parse(params.product as string) : null;
  LogBox.ignoreLogs(['Support for defaultProps will be removed from function components']);

  const toggleOption = (option: IMenuOption, value?: string) => {
    setValidateOptions([]);
    if (!isEmpty(option.values) && isEmpty(value)) {
      setSelectedOption(option);
      setVisibleValues(true);
    } else {
      handleSelectOption(option);
    }
  };

  useEffect(() => {
    if (product && product.variants?.[0]) {
      const item: IOrderItem = {
        id: product.variants[0].id,
        uuid: generateUUID(),
        productId: product.productId,
        name: product.variants[0].name,
        reason: '',
        state: 'DRAFT',
        quantity: 1,
        options: [],
        price: product.variants[0].salePrice,
        discount: 0,
        comment: '',
        image: product.image ?? '',
      };
      setSelectedItem(item);
      setValidationError('');
    } else {
      setSelectedItem(null);
      setValidationError('');
    }
  }, [params.product]);

  const onSelect = (variant: any) => {
    if (!selectedItem) return;

    if (selectedItem.id === variant.id) {
      setSelectedItem({ ...selectedItem, quantity: selectedItem.quantity + 1 });
    } else {
      const item: IOrderItem = {
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
      };
      setSelectedItem(item);
    }
    setValidationError('');
    setValidateOptions([]);
  };

  const validateMandatoryOptions = (item: IOrderItem): ValidationResult => {
    try {
      const currentVariant = product.variants.find((variant: IMenuVariant) => variant.id === item.id);

      if (!currentVariant) {
        return {
          isValid: false,
          missingMandatoryOptions: [],
          productId: product.productId,
        };
      }

      const mandatoryOptions = currentVariant.options?.filter((option: any) => option.mandatory) || [];

      if (mandatoryOptions.length === 0) {
        return {
          isValid: true,
          missingMandatoryOptions: [],
          productId: null,
        };
      }

      const selectedOptionIds = new Set(item.options.map((option) => option.id));

      const missingOptions = mandatoryOptions.filter((option: IMenuOption) => !selectedOptionIds.has(option.id));

      return {
        isValid: missingOptions.length === 0,
        missingMandatoryOptions: missingOptions,
        productId: missingOptions.length > 0 ? product.productId : null,
      };
    } catch (error) {
      console.error('Error in validateMandatoryOptions:', error);
      return {
        isValid: false,
        missingMandatoryOptions: [],
        productId: null,
      };
    }
  };

  const handleSelectOption = useCallback(
    (option: any & { value?: string }) => {
      setSelectedItem((prev) => {
        if (!prev) return prev;

        const isOptionSelected = prev.options.some((selectedOption) => selectedOption.id === option.id);

        const updatedOptions = isOptionSelected
          ? prev.options.filter((item) => item.id !== option.id)
          : [...prev.options, option];

        return { ...prev, options: updatedOptions };
      });
      setValidationError('');
    },
    [setSelectedItem],
  );

  const onRemove = () => {
    if (!selectedItem) return;

    if (selectedItem.quantity > 1) {
      setSelectedItem({
        ...selectedItem,
        quantity: selectedItem.quantity - 1,
      });
    }
  };

  const onSelectValue = (value: any) => {
    if (!selectedOptoin) {
      return;
    }

    setVisibleValues(false);

    handleSelectOption({ ...selectedOptoin, value: value });
  };

  const addItem = () => {
    if (!selectedItem) return;

    const validationResult = validateMandatoryOptions(selectedItem);

    if (!validationResult.isValid) {
      setValidateOptions(validationResult.missingMandatoryOptions);
      const missingOptionsText = validationResult.missingMandatoryOptions.map((option) => option.name).join(', ');
      setValidationError(t('mainPage.validation.mandatoryOptions', { options: missingOptionsText }));
      return;
    }

    let items = [...orderState.items, selectedItem];

    let totalAmount = 0;
    let totalQuantity = 0;

    for (const item of items) {
      const optionTotal = item.options?.reduce((sum, opt) => sum + (opt.price || 0), 0) ?? 0;
      totalAmount += (item.price + optionTotal) * item.quantity;
      totalQuantity += item.quantity;
    }

    const updatedOrder: ICustomerOrder = {
      items: items,
      totalAmount,
      grandTotal: totalAmount,
      totalQuantity,
      state: 'DRAFT',
    };

    setOrderState(updatedOrder);

    router.back();
    setSelectedOption(null);
    setValidationError('');
    setSelectedItem(null);
    setValidateOptions([]);
  };

  const goBack = () => {
    router.back();
    setSelectedOption(null);
    setValidationError('');
    setSelectedItem(null);
    setValidateOptions([]);
  };

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => goBack()}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 8,
            gap: 8,
          }}
        >
          <Icon source="arrow-left" size={24} color="#333" />
          <Text style={styles.backText}>{t('mainPage.GoBack')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setDrawerVisible(true)} style={{}}>
          <FAB
            animated
            icon="cart-outline"
            size="small"
            style={styles.fab}
            onPress={() => {
              setDrawerVisible(true);
            }}
            color="white"
          />
          {orderState?.items.length > 0 && <Badge style={styles.badge}>{orderState?.items.length}</Badge>}
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.leftColumn}>
          <Image source={{ uri: product?.image }} style={styles.pizzaImage} resizeMode="cover" />
        </View>

        <ScrollView style={styles.rightColumn} contentContainerStyle={styles.rightContent}>
          <Text style={styles.title}>{product?.name || 'Roberto'}</Text>
          {product?.specification && (
            <View style={styles.specificationContainer}>
              <View style={!isExpanded ? styles.htmlClamp : undefined}>
                <RenderHtml contentWidth={width} source={{ html: product?.specification }} />
              </View>
              <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}>
                <Text style={styles.expandToggle}>{isExpanded ? 'Хураах' : 'Илүү их'}</Text>
              </TouchableOpacity>
            </View>
          )}
          <Text style={styles.sectionTitle}>{t('mainPage.Variants')}</Text>
          <Text style={styles.extraDesc}>{t('mainPage.chooseOption')}</Text>
          <View style={styles.sizeSelector}>
            {product.variants.map((variant: IMenuVariant) => (
              <TouchableOpacity
                key={variant.id}
                onPress={() => onSelect(variant)}
                style={[styles.sizeButton, selectedItem?.id === variant.id && styles.sizeButtonSelected]}
              >
                <Text style={styles.sizeText}>{variant.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {!isEmpty(product.variants.find((variant: IMenuVariant) => variant?.id === selectedItem?.id)?.options) && (
            <>
              <Text style={styles.sectionTitle}>{t('mainPage.extra')}</Text>
              <Text style={[validationError ? styles.validateDesc : styles.extraDesc]}>
                {validationError ? 'Шаардлагатай сонголтуудыг сонгоно уу' : t('mainPage.chooseIngredients')}{' '}
              </Text>
              <View style={styles.toppingsWrapper}>
                {product.variants
                  .find((variant: IMenuVariant) => variant?.id === selectedItem?.id)
                  ?.options?.map((option: IMenuOption) => {
                    return (
                      <TouchableOpacity
                        key={option.id}
                        onPress={() =>
                          toggleOption(
                            option,
                            selectedItem?.options.find((selectedOption) => selectedOption.id === option.id)?.value,
                          )
                        }
                        style={[
                          styles.sizeButton,
                          validateOptions.some((opt) => opt.id === option.id)
                            ? styles.validateButtonSelected
                            : selectedItem?.options.some((selectedOption) => selectedOption.id === option.id) &&
                              styles.sizeButtonSelected,
                        ]}
                      >
                        {option.mandatory && (
                          <Text
                            style={[
                              validateOptions.some((opt) => opt.id === option.id)
                                ? { marginRight: 4, color: 'white' }
                                : { marginRight: 4, color: 'red' },
                            ]}
                          >
                            *
                          </Text>
                        )}
                        <Text
                          style={[
                            validateOptions.some((opt) => opt.id === option.id)
                              ? styles.validateText
                              : styles.toppingText,
                          ]}
                        >
                          {option.name}
                          {!isEmpty(
                            selectedItem?.options.find((selectedOption) => selectedOption.id === option.id)?.value,
                          ) &&
                            `: ${
                              selectedItem?.options.find((selectedOption) => selectedOption.id === option.id)?.value
                            }`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            </>
          )}

          <View style={styles.priceSection}>
            <View style={styles.quantityControls}>
              <Pressable onPress={() => onRemove()} style={styles.qtyButton}>
                <Text style={styles.qtyButtonText}>−</Text>
              </Pressable>
              <Text style={styles.qtyNumber}>{selectedItem?.quantity}</Text>
              <Pressable
                onPress={() =>
                  onSelect(product.variants.find((variant: IMenuVariant) => variant?.id === selectedItem?.id))
                }
                style={styles.qtyButton}
              >
                <Text style={styles.qtyButtonText}>+</Text>
              </Pressable>
            </View>
            <Text style={styles.priceText}>
              {selectedItem && calculateOrderItem(selectedItem)}
              {CURRENCY}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.orderButton}
            onPress={() => {
              addItem();
            }}
          >
            <Text style={styles.orderButtonText}>{t('mainPage.AddToCard')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      {orderState && (
        <DraftOrder
          order={orderState}
          setOrder={setOrderState}
          visible={drawerVisible}
          onClose={() => setDrawerVisible(false)}
        />
      )}

      {visibleValues && (
        <OptionValuesModal
          visible={visibleValues}
          values={selectedOptoin.values}
          onClose={() => {
            setVisibleValues(false);
          }}
          onSelectValue={onSelectValue}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
  },
  clamped: {
    maxHeight: 100,
    overflow: 'hidden',
  },
  expanded: {
    height: 'auto',
  },
  expandToggle: {
    color: '#007BFF',
    fontWeight: '600',
    marginTop: 8,
  },
  content: {
    flexDirection: 'row',
    gap: 16,
    height: '86%',
    marginBottom: 24,
  },
  leftColumn: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
  },
  rightColumn: {
    flex: 1,
    alignSelf: 'center',
  },
  rightContent: {
    padding: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
  },
  backText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    backgroundColor: '#fde68a',
    padding: 8,
    borderRadius: 999,
  },
  statusBadge: {
    backgroundColor: '#ef4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
  },
  pizzaImage: {
    height: 560,
    width: '100%',
    borderRadius: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    color: '#6b7280',
    fontSize: 14,
    marginBottom: 16,
  },
  extraDesc: {
    color: '#6b7280',
    fontSize: 13,
    marginBottom: 16,
  },

  validateDesc: {
    color: 'red',
    fontSize: 13,
    marginBottom: 16,
  },

  sectionTitle: {
    fontWeight: '600',
    fontSize: 16,
  },
  sizeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sizeButton: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    paddingVertical: 8,
    marginBottom: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
    marginRight: 8,
  },
  sizeButtonSelected: {
    backgroundColor: '#fde68a',
  },

  validateButtonSelected: {
    backgroundColor: 'red',
  },
  sizeText: {
    fontWeight: '600',
    fontSize: 14,
  },
  toppingsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  topping: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginRight: 8,
    marginBottom: 8,
  },
  toppingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  validateText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
  },
  moreToppings: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 8,
  },
  moreToppingsText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 14,
  },
  priceText: {
    fontSize: 24,
    fontWeight: '700',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyButton: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  qtyButtonText: {
    fontSize: 20,
    fontWeight: '700',
  },
  qtyNumber: {
    fontSize: 20,
    marginHorizontal: 12,
  },
  orderButton: {
    backgroundColor: defaultColor,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  orderButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  specificationContainer: {
    marginBottom: 16,
  },
  fab: {
    backgroundColor: defaultColor,
    width: 40,
    height: 40,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: 'red',
    color: 'white',
  },
  ul: {
    paddingLeft: 20,
    paddingBottom: 20,
    height: 400,
  },
  li: {
    fontWeight: '300',
    height: 20,
  },
  htmlClamp: {
    maxHeight: 80, // 4 lines × 20 lineHeight = 80
    overflow: 'hidden',
  },
});

export default ProductDetailsScreen;
