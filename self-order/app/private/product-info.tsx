import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FAB, Icon } from 'react-native-paper';
import { defaultColor } from '@/constants/Colors';
import { ICustomerOrder, IMenuOption, IMenuVariant, IOrderItem } from '@/types';
import { isEmpty } from 'lodash';
import { useOrder } from '@/providers/OrderProvider';
import DraftOrder from '@/components/DraftOrder';
import RenderHtml from 'react-native-render-html';
import { LogBox } from 'react-native';
import { CURRENCY } from '@/constants';
import { calculateOrderItem, generateUUID } from '@/utils';
import OptionValuesModal from '@/components/Modal/OptionValuesModal';
import CustomBadge from '@/components/Badge';

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
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [visibleValues, setVisibleValues] = useState(false);
  const [selectedOption, setSelectedOption] = useState<any>(null);
  const [validationError, setValidationError] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<IOrderItem | null>();
  const [validateOptions, setValidateOptions] = useState<IMenuOption[]>([]);

  // Memoize product parsing to avoid doing it on every render
  const product = useMemo(() => {
    if (!params.product) return null;
    try {
      return JSON.parse(params.product as string);
    } catch (e) {
      console.error('Error parsing product:', e);
      return null;
    }
  }, [params.product]);

  // Memoize current variant
  const currentVariant = useMemo(() => {
    if (!product || !selectedItem) return null;
    return product.variants.find((variant: IMenuVariant) => variant.id === selectedItem.id);
  }, [product, selectedItem?.id]);

  LogBox.ignoreLogs(['Support for defaultProps will be removed from function components']);

  const toggleOption = useCallback((option: IMenuOption, value?: string) => {
    setValidateOptions([]);
    if (!isEmpty(option.values) && isEmpty(value)) {
      setSelectedOption(option);
      setVisibleValues(true);
    } else {
      handleSelectOption(option);
    }
  }, []);

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
  }, [params.product, product]);

  const onSelect = useCallback(
    (variant: IMenuVariant) => {
      if (!selectedItem || !product) return;

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
    },
    [selectedItem, product],
  );

  const validateMandatoryOptions = useCallback(
    (item: IOrderItem): ValidationResult => {
      try {
        if (!product) {
          return {
            isValid: false,
            missingMandatoryOptions: [],
            productId: null,
          };
        }

        const currentVariant = product.variants.find((variant: IMenuVariant) => variant.id === item.id);

        if (!currentVariant) {
          return {
            isValid: false,
            missingMandatoryOptions: [],
            productId: product.productId,
          };
        }

        const mandatoryOptions = currentVariant.options?.filter((option: IMenuOption) => option.mandatory) || [];

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
    },
    [product],
  );

  // Memoize validation result
  const validationResult = useMemo(() => {
    if (!selectedItem) {
      return {
        isValid: false,
        missingMandatoryOptions: [],
        productId: null,
      };
    }
    return validateMandatoryOptions(selectedItem);
  }, [selectedItem, validateMandatoryOptions]);

  const handleSelectOption = useCallback((option: any & { value?: string }) => {
    setSelectedItem((prev) => {
      if (!prev) return prev;

      const isOptionSelected = prev.options.some((selectedOption) => selectedOption.id === option.id);

      const updatedOptions = isOptionSelected
        ? prev.options.filter((item) => item.id !== option.id)
        : [...prev.options, option];

      return { ...prev, options: updatedOptions };
    });
    setValidationError('');
  }, []);

  const onRemove = useCallback(() => {
    if (!selectedItem) return;

    if (selectedItem.quantity > 1) {
      setSelectedItem({
        ...selectedItem,
        quantity: selectedItem.quantity - 1,
      });
    }
  }, [selectedItem]);

  const onSelectValue = useCallback(
    (value: any) => {
      if (!selectedOption) {
        return;
      }

      setVisibleValues(false);
      handleSelectOption({ ...selectedOption, value: value });
    },
    [selectedOption, handleSelectOption],
  );

  const addItem = useCallback(() => {
    if (!selectedItem) return;

    if (!validationResult.isValid) {
      setValidateOptions(validationResult.missingMandatoryOptions);
      const missingOptionsText = validationResult.missingMandatoryOptions.map((option) => option.name).join(', ');
      setValidationError(t('mainPage.validation.mandatoryOptions', { options: missingOptionsText }));
      return;
    }

    setOrderState((prevState) => {
      const items = [...prevState.items, selectedItem];

      // Calculate totals in one pass
      let totalAmount = 0;
      let totalQuantity = 0;

      for (const item of items) {
        const optionTotal = item.options?.reduce((sum, opt) => sum + (opt.price || 0), 0) ?? 0;
        totalAmount += (item.price + optionTotal) * item.quantity;
        totalQuantity += item.quantity;
      }

      return {
        items,
        totalAmount,
        grandTotal: totalAmount,
        totalQuantity,
        state: 'DRAFT',
      };
    });

    router.back();
    setSelectedOption(null);
    setValidationError('');
    setSelectedItem(null);
    setValidateOptions([]);
  }, [selectedItem, validationResult, t, setOrderState]);

  const goBack = useCallback(() => {
    router.back();
    setSelectedOption(null);
    setValidationError('');
    setSelectedItem(null);
    setValidateOptions([]);
  }, []);

  // Memoize render of variants section
  const renderVariants = useMemo(() => {
    if (!product || !product.variants) return null;

    return (
      <>
        <Text style={styles.sectionTitle}>{t('mainPage.Variants')}</Text>
        <Text style={styles.extraDesc}>{t('mainPage.chooseOption')}</Text>
        <View style={styles.sizeSelector}>
          {product.variants.map((variant: IMenuVariant) => (
            <TouchableOpacity
              key={variant.id}
              onPress={() => onSelect(variant)}
              style={[styles.sizeButton, selectedItem?.id === variant.id && styles.sizeButtonSelected]}
            >
              <Text style={[selectedItem?.id === variant.id ? styles.selectedSizeText : styles.sizeText]}>
                {variant.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </>
    );
  }, [product?.variants, selectedItem?.id, t, onSelect]);

  // Memoize render of options section
  const renderOptions = useMemo(() => {
    if (!currentVariant || isEmpty(currentVariant.options)) return null;

    return (
      <>
        <Text style={styles.sectionTitle}>{t('mainPage.extra')}</Text>
        <Text style={[validationError ? styles.validateDesc : styles.extraDesc]}>
          {validationError ? 'Шаардлагатай сонголтуудыг сонгоно уу' : t('mainPage.chooseIngredients')}{' '}
        </Text>
        <View style={styles.toppingsWrapper}>
          {currentVariant.options?.map((option: IMenuOption) => {
            const isSelected = selectedItem?.options.some((selectedOption) => selectedOption.id === option.id);
            const needsValidation = validateOptions.some((opt) => opt.id === option.id);
            const selectedValue = selectedItem?.options.find(
              (selectedOption) => selectedOption.id === option.id,
            )?.value;

            return (
              <TouchableOpacity
                key={option.id}
                onPress={() => toggleOption(option, selectedValue)}
                style={[
                  styles.sizeButton,
                  needsValidation ? styles.validateButtonSelected : isSelected && styles.sizeButtonSelected,
                ]}
              >
                <Text
                  style={[
                    needsValidation
                      ? styles.validateText
                      : isSelected
                      ? styles.selectedToppingText
                      : styles.toppingText,
                  ]}
                >
                  {option.name}
                  {!isEmpty(selectedValue) && `: ${selectedValue}`}
                </Text>
                {option.mandatory && (
                  <Text style={[needsValidation ? { marginLeft: 4, color: 'white' } : { marginLeft: 4, color: 'red' }]}>
                    *
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </>
    );
  }, [currentVariant, selectedItem?.options, validateOptions, validationError, t, toggleOption]);

  // Memoize price calculation
  const priceDisplay = useMemo(() => {
    if (!selectedItem) return '0' + CURRENCY;
    return calculateOrderItem(selectedItem) + CURRENCY;
  }, [selectedItem]);

  // Memoize HTML content
  const htmlContent = useMemo(() => {
    if (!product?.specification) return null;
    return { html: product.specification };
  }, [product?.specification]);

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={goBack}
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
        <View
          style={{
            position: 'absolute',
            top: 20,
            right: 0,
          }}
        >
          <TouchableOpacity onPress={() => setDrawerVisible(true)}>
            <FAB
              animated={false}
              icon="cart-outline"
              size="small"
              style={styles.fab}
              onPress={() => {
                setDrawerVisible(true);
              }}
              color="white"
            />
            {orderState?.totalQuantity > 0 && <CustomBadge value={orderState?.totalQuantity} />}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.leftColumn}>
          <Image
            source={{ uri: product?.image }}
            style={styles.pizzaImage}
            resizeMode="cover"
            // Add default onError handler
            onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
          />
        </View>

        <ScrollView style={styles.rightColumn} contentContainerStyle={styles.rightContent}>
          <Text style={styles.title}>{product?.name || 'Roberto'}</Text>

          {htmlContent && (
            <View style={styles.specificationContainer}>
              <View style={!isExpanded ? styles.htmlClamp : undefined}>
                <RenderHtml contentWidth={width} source={htmlContent} />
              </View>
              <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}>
                <Text style={styles.expandToggle}>{isExpanded ? 'Хураах' : 'Илүү их'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Render variants section */}
          {renderVariants}

          {/* Render options section */}
          {renderOptions}

          <View style={styles.priceSection}>
            <Text style={styles.priceText}>{priceDisplay}</Text>

            <View style={styles.quantityControls}>
              <TouchableOpacity onPress={onRemove}>
                <FAB animated={false} icon="minus" size="small" style={styles.secondfab} color={defaultColor} />
              </TouchableOpacity>

              <Text style={styles.qtyNumber}>{selectedItem?.quantity || 0}</Text>
              <TouchableOpacity onPress={() => currentVariant && onSelect(currentVariant)}>
                <FAB animated={false} icon="plus" size="small" style={styles.plusFab} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.orderButton} onPress={addItem}>
            <Text style={styles.orderButtonText}>{t('mainPage.AddToCard')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <DraftOrder visible={drawerVisible} onCloseModal={() => setDrawerVisible(false)} />

      {visibleValues && (
        <OptionValuesModal
          visible={visibleValues}
          values={selectedOption.values}
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
  plusFab: {
    backgroundColor: defaultColor,
    width: 56,
    height: 56,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
  },
  secondfab: {
    backgroundColor: 'white',
    width: 56,
    borderColor: '#f0f0f0',
    borderWidth: 1,
    height: 56,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: defaultColor,
  },

  validateButtonSelected: {
    backgroundColor: 'red',
  },
  selectedSizeText: {
    fontWeight: '600',
    fontSize: 14,
    color: 'white',
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

  selectedToppingText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
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
    backgroundColor: '#EB1833',
    width: 56,
    height: 56,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: 'white',
    color: '#EB1833',
    fontWeight: 700,
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
