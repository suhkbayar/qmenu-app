import { FAB, Icon } from 'react-native-paper';
import { StyleSheet, Image } from 'react-native';
import { defaultColor } from '@/constants/Colors';
import { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client';
import { WAITER_CALL } from '@/graphql/mutation/waiter';
import { useToast } from 'react-native-toast-notifications';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import ReceptionistBellIcon from '@/assets';
import TableQrModal from '../Modal/TableQrModal';
import { useOrderStore } from '@/cache/order.store';

const HelpFloatingButton = () => {
  const toast = useToast();
  const router = useRouter();
  const { t } = useTranslation('language');
  const [open, setOpen] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const totalQuantity = useOrderStore((state) => state.orderState.totalQuantity);
  const hasItems = (totalQuantity || 0) > 0;

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
    onError: (err) => {
      console.log('WAITER_CALL error:', err);
    },
  });

  const handlePress = useCallback((state: { open: boolean }) => {
    setOpen(state.open);
  }, []);

  const handleQrPress = useCallback(() => {
    setOpen(false);
    setShowQr(true);
  }, []);

  const onCloseQrModal = useCallback(() => {
    setShowQr(false);
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
        fabStyle={[styles.fab, hasItems && styles.fabWithOrder]}
        visible
        backdropColor={'rgba(114, 114, 114, 0.96)'}
        style={{ zIndex: 999 }}
        onStateChange={handlePress}
        actions={[
          {
            icon: 'history',
            style: { backgroundColor: defaultColor, bottom: 70, right: 6 },
            color: 'white',
            size: 'medium',
            label: t('mainPage.orderHistory'),
            labelStyle: { color: defaultColor, bottom: 70, fontSize: 18 },
            onPress: handleHistoryPress,
          },
          {
            icon: 'qrcode-scan',
            style: { backgroundColor: defaultColor, bottom: 70, right: 6 },
            color: 'white',
            size: 'medium',
            label: 'QR код',
            labelStyle: { color: defaultColor, bottom: 70, fontSize: 18 },
            onPress: handleQrPress,
          },
          {
            icon: () => (
              <Image
                source={require('../../assets/images/table1.png')}
                style={{ width: 26, height: 26 }}
                resizeMode="contain"
              />
            ),
            style: { backgroundColor: defaultColor, bottom: 70, right: 6 },
            color: 'white',
            size: 'medium',
            label: t('mainPage.table_clean'),
            labelStyle: { color: defaultColor, bottom: 70, fontSize: 18 },
            onPress: () => call({ variables: { message: 'Ширээ цэвэрлүүлэх' } }),
          },
          {
            icon: () => <ReceptionistBellIcon width={24} height={24} color="white" />,
            style: { backgroundColor: defaultColor, bottom: 70, right: 6 },
            color: 'white',
            size: 'medium',
            label: t('mainPage.call_waiter'),
            labelStyle: { color: defaultColor, bottom: 70, fontSize: 18 },
            onPress: () => call({ variables: { message: t('mainPage.call_waiter') } }),
          },
          {
            icon: 'credit-card-outline',
            label: t('mainPage.request_bill'),
            color: 'white',
            size: 'medium',
            labelStyle: { color: defaultColor, bottom: 70, fontSize: 18 },
            style: { backgroundColor: defaultColor, bottom: 70, right: 6 },
            onPress: () => call({ variables: { message: t('mainPage.request_bill') } }),
          },
        ]}
      />
      <TableQrModal visible={showQr} onClose={onCloseQrModal} />
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    backgroundColor: '#EB1833',
    borderRadius: 999,
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    height: 70,
    bottom: 16,
  },
  fabWithOrder: {
    bottom: 76,
  },
});

export default HelpFloatingButton;
