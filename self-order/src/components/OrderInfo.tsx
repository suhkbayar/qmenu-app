import { CURRENCY } from '@/src/constants';
import { IOrder } from '@/src/types';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet, Text } from 'react-native';

type Props = { order: IOrder };

const OrderInfo = ({ order }: Props) => {
  const { t } = useTranslation('language');
  const taxSum = Math.abs(order.taxAmount + order.vatAmount + order.cityTax).toLocaleString();

  return (
    <View style={{ gap: 4, marginTop: 16 }}>
      <View style={styles.row}>
        <Text style={styles.label}>{t('mainPage.Tax')}:</Text>
        <Text style={styles.value}>{taxSum} {CURRENCY}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>{t('mainPage.Discount')}:</Text>
        <Text style={styles.value}>{order.discountAmount.toLocaleString()} {CURRENCY}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>{t('mainPage.Total')}:</Text>
        <Text style={styles.total}>{order.grandTotal.toLocaleString()} {CURRENCY}</Text>
      </View>
    </View>
  );
};

export default OrderInfo;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '26%', gap: 16 },
  label: { fontWeight: '700', fontSize: 16, color: '#4B5563' },
  value: { fontWeight: '500', fontSize: 16, color: '#4B5563' },
  total: { fontWeight: '700', fontSize: 16, color: '#4B5563' },
});
