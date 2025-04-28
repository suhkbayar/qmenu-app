import { CURRENCY } from '@/constants';
import { IOrder } from '@/types';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet, Text } from 'react-native';

type OrderInfoProps = {
  order: IOrder;
};

const OrderInfo = ({ order }: OrderInfoProps) => {
  const { t } = useTranslation('language');
  const orderTaxSum = order && Math.abs(order?.taxAmount + order?.vatAmount + order?.cityTax).toLocaleString();

  return (
    <View
      style={{
        gap: 4,
        marginTop: 16,
      }}
    >
      <View style={styles.summary}>
        <Text style={styles.amountTitle}>{t('mainPage.Tax')}:</Text>
        <Text style={styles.total}>
          {orderTaxSum} {CURRENCY}
        </Text>
      </View>
      <View style={styles.summary}>
        <Text style={styles.amountTitle}>{t('mainPage.Discount')}:</Text>
        <Text style={styles.total}>
          {order.discountAmount.toLocaleString()} {CURRENCY}
        </Text>
      </View>
      <View style={styles.summary}>
        <Text style={styles.amountTitle}>{t('mainPage.Total')}:</Text>
        <Text style={styles.summaryTotal}>
          {order.totalAmount.toLocaleString()} {CURRENCY}
        </Text>
      </View>
    </View>
  );
};

export default OrderInfo;

const styles = StyleSheet.create({
  amountTitle: {
    fontWeight: '700',
    fontSize: 16,
    color: '#4B5563',
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '26%',
    gap: 16,
  },
  total: {
    fontWeight: '500',
    fontSize: 16,
    color: '#4B5563',
  },
  summaryTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4B5563',
  },
});
