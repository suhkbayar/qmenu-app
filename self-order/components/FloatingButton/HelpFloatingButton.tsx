import { FAB, Icon } from 'react-native-paper';
import { StyleSheet } from 'react-native';
import { defaultColor } from '@/constants/Colors';
import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { WAITER_CALL } from '@/graphql/mutation/waiter';
import { useToast } from 'react-native-toast-notifications';

const HelpFloatingButton = () => {
  const toast = useToast();
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

  return (
    <FAB.Group
      open={open}
      icon={open ? 'close' : 'headphones'}
      color="white"
      fabStyle={styles.fab}
      visible
      onStateChange={({ open }) => setOpen(open)}
      actions={[
        {
          icon: 'message-text-outline',
          style: { backgroundColor: defaultColor, bottom: 60 },
          color: 'white',
          label: 'Зөөгч дуудах',
          labelStyle: { color: defaultColor, bottom: 60 },
          onPress: () => call({ variables: { message: 'Зөөгч дуудах' } }),
        },
        {
          icon: 'file-document-outline',
          label: 'Тооцоо авах',
          color: 'white',
          labelStyle: { color: defaultColor, bottom: 70 },
          style: { backgroundColor: defaultColor, bottom: 70 },
          onPress: () => call({ variables: { message: 'Тооцоо авах' } }),
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
    width: 66,
    height: 66,
    bottom: 76,
  },
});

export default HelpFloatingButton;
