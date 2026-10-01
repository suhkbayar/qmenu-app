import { CURRENCY } from '@/src/constants';
import { IOrder } from '@/src/types';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet, Text } from 'react-native';
import { useThemeStore } from '@/src/store/theme.store';

type Props = { order: IOrder };

const OrderInfo = ({ order }: Props) => {
  const { t } = useTranslation('language');
  const { theme } = useThemeStore();
  const taxSum = Math.abs(order.taxAmount + order.vatAmount + order.cityTax).toLocaleString();

  return (
    <View style={{ gap: 8, marginTop: 20 }}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>{t('mainPage.Tax')}:</Text>
        <Text style={[styles.value, { color: theme.textSecondary }]}>{taxSum} {CURRENCY}</Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>{t('mainPage.Discount')}:</Text>
        <Text style={[styles.value, { color: theme.textSecondary }]}>{order.discountAmount.toLocaleString()} {CURRENCY}</Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.text }]}>{t('mainPage.Total')}:</Text>
        <Text style={[styles.total, { color: theme.primary }]}>{order.grandTotal.toLocaleString()} {CURRENCY}</Text>
      </View>
    </View>
  );
};

export default OrderInfo;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '30%', minWidth: 280, gap: 20 },
  label: { fontWeight: '600', fontSize: 18 },
  value: { fontWeight: '500', fontSize: 18 },
  total: { fontWeight: '800', fontSize: 22 },
});
