import { FAB, Icon } from 'react-native-paper';
import { StyleSheet, Image } from 'react-native';
import { defaultColor } from '@/constants/Colors';
import { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client';
import { WAITER_CALL } from '@/graphql/mutation/waiter';
import { useToast } from 'react-native-toast-notifications';
import { useTranslation } from 'react-i18next';
import ReceptionistBellIcon from '@/assets';

const HelpFloatingButton = () => {
  const toast = useToast();
  const { t } = useTranslation('language');
  const [open, setOpen] = useState(false);

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
  });
  const handlePress = useCallback((state: { open: boolean }) => {
    setOpen(state.open);
  }, []);

  return (
    <FAB.Group
      open={open}
      icon={open ? 'close' : 'headphones'}
      color="white"
      fabStyle={styles.fab}
      visible
      backdropColor={'rgba(114, 114, 114, 0.96)'}
      style={{
        zIndex: 999,
      }}
      onStateChange={handlePress}
      actions={[
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
  );
};

const styles = StyleSheet.create({
  fab: {
    backgroundColor: '#EB1833',
    borderRadius: 999, // <- ensures full circle
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: 10,
    width: 70,
    height: 70,
    bottom: 76,
  },
});

export default HelpFloatingButton;
