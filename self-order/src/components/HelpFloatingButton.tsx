import { FAB, Icon } from 'react-native-paper';
import { StyleSheet } from 'react-native';
import { defaultColor } from '@/src/constants/Colors';
import { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client';
import { WAITER_CALL } from '@/src/graphql/mutations/waiter';
import { useToast } from 'react-native-toast-notifications';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import ReceptionistBellIcon from '@/assets';
import TableQrModal from './modals/TableQrModal';
import { useOrderStore } from '@/src/store/order.store';
import { useThemeStore } from '@/src/store/theme.store';

const HelpFloatingButton = () => {
  const toast = useToast();
  const router = useRouter();
  const { t } = useTranslation('language');
  const [open, setOpen] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const totalQuantity = useOrderStore((state) => state.orderState.totalQuantity);
  const hasItems = (totalQuantity || 0) > 0;
  const { theme } = useThemeStore();
  const actionStyle = [styles.action, { backgroundColor: theme.primary }];
  const actionLabelStyle = [styles.actionLabel, { color: defaultColor }];

  const [call] = useMutation(WAITER_CALL, {
    onCompleted: () => {
      toast.show('Амжилттай', {
        type: 'success',
        icon: <Icon source="check-circle" size={30} color="#fff" />,
        placement: 'top',
        successColor: defaultColor,
        duration: 4000,
        animationType: 'slide-in',
      });
    },
    onError: (err) => console.log('WAITER_CALL error:', err),
  });

  const handlePress = useCallback((state: { open: boolean }) => setOpen(state.open), []);
  const handleQrPress = useCallback(() => {
    setOpen(false);
    setShowQr(true);
  }, []);
  const handleHistoryPress = useCallback(() => {
    setOpen(false);
    router.push('/private/history');
  }, [router]);

  return (
    <>
      <FAB.Group
        open={open}
        icon={open ? 'close' : 'help-circle'}
        color="white"
        fabStyle={[styles.fab, hasItems && styles.fabWithOrder, { backgroundColor: theme.danger }]}
        visible
        backdropColor="rgba(114,114,114,0.96)"
        style={{ zIndex: 999 }}
        onStateChange={handlePress}
        actions={[
          {
            icon: 'history',
            style: actionStyle,
            color: 'white',
            size: 'medium',
            label: t('mainPage.orderHistory'),
            labelStyle: actionLabelStyle,
            onPress: handleHistoryPress,
          },
          {
            icon: 'qrcode-scan',
            style: actionStyle,
            color: 'white',
            size: 'medium',
            label: 'QR код',
            labelStyle: actionLabelStyle,
            onPress: handleQrPress,
          },
          {
            icon: 'broom',
            style: actionStyle,
            color: 'white',
            size: 'medium',
            label: t('mainPage.table_clean'),
            labelStyle: actionLabelStyle,
            onPress: () => call({ variables: { message: 'Ширээ цэвэрлүүлэх' } }),
          },
          {
            icon: () => <ReceptionistBellIcon width={24} height={24} color="white" />,
            style: actionStyle,
            color: 'white',
            size: 'medium',
            label: t('mainPage.call_waiter'),
            labelStyle: actionLabelStyle,
            onPress: () => call({ variables: { message: t('mainPage.call_waiter') } }),
          },
          {
            icon: 'credit-card-outline',
            label: t('mainPage.request_bill'),
            color: 'white',
            size: 'medium',
            labelStyle: actionLabelStyle,
            style: actionStyle,
            onPress: () => call({ variables: { message: t('mainPage.request_bill') } }),
          },
        ]}
      />
      <TableQrModal visible={showQr} onClose={() => setShowQr(false)} />
    </>
  );
};

export default HelpFloatingButton;

const styles = StyleSheet.create({
  fab: {
    borderRadius: 999,
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    height: 70,
    bottom: 16,
  },
  fabWithOrder: { bottom: 76 },
  action: { backgroundColor: defaultColor, bottom: 70, right: 6 },
  actionLabel: { color: defaultColor, bottom: 70, fontSize: 18 },
});
