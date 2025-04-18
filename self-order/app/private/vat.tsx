import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, Image, TouchableOpacity } from 'react-native';
import { Text, Surface, TouchableRipple, Button, Icon } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { FieldValues, useForm } from 'react-hook-form';
import { useOrder } from '@/providers/OrderProvider';
import { router, useLocalSearchParams } from 'expo-router';
import { useLazyQuery } from '@apollo/client';
import { GET_VAT_PAYER } from '@/graphql/query/vat';
import { defaultColor } from '@/constants/Colors';
import { useToast } from 'react-native-toast-notifications';
import { useTranslation } from 'react-i18next';
import { validPrefixes } from '@/constants';

const EbarimtScreen = () => {
  const toast = useToast();
  const { t } = useTranslation('language');
  const { orderId } = useLocalSearchParams();
  const { orderState, setOrderState } = useOrder();
  const [personRegister, setPersonRegister] = useState<string>();
  const [buyerRegister, setBuyerRegister] = useState<string>();
  const [isCompany, setIsCompany] = useState<boolean>(true);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<FieldValues>({
    mode: 'all',
    defaultValues: {
      vatType: '1',
    },
  });
  const { vatType, buyer } = watch();

  const [getVatPayer, { loading }] = useLazyQuery(GET_VAT_PAYER, {
    onCompleted(data) {
      setValue('buyer', data.getVatPayer.name);
      if (!data.getVatPayer.found) {
        reset({
          buyer: null,
        });
      }
    },
    onError(err) {
      toast.show(t('mainPage.Error'), {
        type: 'warning',
        icon: <Icon source="alert-circle-outline" size={30} color="#fff" />,
        placement: 'top',
        warningColor: defaultColor,
        duration: 4000,
        animationType: 'slide-in',
      });
    },
  });

  const onSubmit = (data: any) => {
    let targetVat = {};
    if (data.vatType === '1') {
      targetVat = {
        vatType: '1',
      };
    } else {
      targetVat = {
        vatType: '3',
        buyer: data.buyer,
        register: data.register,
      };
    }
    setOrderState({ ...orderState, ...targetVat });

    router.push({
      pathname: '/private/payment',
      params: { orderId },
    });
  };

  const onSelect = (vatValue: any) => {
    setValue('vatType', vatValue);
  };

  const onPersonRegister = (value: any) => {
    const isLetterPrefix = /^[\p{L}]{2}/u.test(value);
    const prefixOne = value.substring(0, 1).toUpperCase();
    const prefixTwo = value.substring(1, 2).toUpperCase();
    let isLetterOne = validPrefixes.includes(prefixOne);
    let isLetterTwo = validPrefixes.includes(prefixTwo);
    if (isLetterOne && !isLetterTwo) {
      setPersonRegister(value.toUpperCase());
    }
    if (isLetterOne && isLetterTwo && value.length <= 10) {
      setPersonRegister(value.toUpperCase());
      if (isLetterPrefix && value.length === 10) {
        setValue('register', value);
        getVatPayer({ variables: { register: value } });
      } else {
        reset({
          buyer: null,
        });
      }
    }
  };

  const onRegister = (value: any) => {
    if (value.length <= 7) {
      setBuyerRegister(value);
      if (value.length === 7) {
        setValue('register', value);
        getVatPayer({ variables: { register: value } });
      } else {
        reset({
          buyer: null,
        });
      }
    }
  };

  const onInstitutionVatType = (boolean: boolean) => {
    setIsCompany(boolean);
    setPersonRegister('');
    setBuyerRegister('');
    reset({
      buyer: null,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />

      <View style={styles.logoContainer}>
        <Image source={require('../../assets/icon/eBarimt_logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.subtitle}>НӨАТ-ын баримтын төрөл</Text>
      </View>

      <View style={styles.cardContainer}>
        <Surface style={[styles.card, vatType === '1' && styles.activeCard]}>
          <TouchableRipple onPress={() => onSelect('1')} style={styles.cardTouchable} borderless>
            <View style={styles.cardContent}>
              <View style={styles.iconContainer}>
                <Icon source="account-outline" size={60} color={vatType === '1' ? 'white' : '#a9a9a9'} />
              </View>
              <Text style={[vatType === '1' ? styles.activeCardText : styles.cardText]}>Хувь хүн</Text>
            </View>
          </TouchableRipple>
        </Surface>

        <Surface style={[styles.card, vatType === '3' && styles.activeCard]}>
          <TouchableRipple onPress={() => onSelect('3')} style={styles.cardTouchable} borderless>
            <View style={styles.cardContent}>
              <View style={styles.iconContainer}>
                <Icon source="bank" size={60} color={vatType === '3' ? 'white' : '#a9a9a9'} />
              </View>
              <Text style={[vatType === '3' ? styles.activeCardText : styles.cardText]}>Байгууллага</Text>
            </View>
          </TouchableRipple>
        </Surface>
      </View>
      {vatType === '3' && (
        <View style={styles.cardContainer}>
          <Text>asd</Text>
        </View>
      )}
      <View style={styles.bottomContainer}>
        <Button
          mode="outlined"
          style={styles.backButton}
          labelStyle={styles.backButtonText}
          contentStyle={styles.buttonContent}
          onPress={() => console.log('Back pressed')}
        >
          Буцах
        </Button>

        <Button
          mode="contained"
          style={styles.continueButton}
          labelStyle={styles.continueButtonText}
          contentStyle={styles.buttonContent}
          onPress={() => console.log('Continue pressed')}
        >
          Үргэлжлүүлэх (1) 10 MNT
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 8,
  },
  logo: {
    width: '100%',
    height: 100,
    alignSelf: 'center',
    marginBottom: 32,
  },
  logoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#2764b1',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
  },
  cardContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  buttonContent: {
    height: 52,
  },
  card: {
    width: '20%',
    height: 160,
    backgroundColor: '#efefef',
    borderRadius: 12,
    margin: 10,
    elevation: 2,
    overflow: 'hidden',
  },
  activeCard: {
    backgroundColor: defaultColor,
  },
  cardTouchable: {
    flex: 1,
  },
  cardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#666',
  },

  activeCardText: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  bottomContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'absolute',
    bottom: 20,
    width: '100%',
    paddingHorizontal: 20,
  },
  backButton: {
    backgroundColor: '#e6e6e6',
    borderWidth: 0,
    borderRadius: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#666',
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    paddingHorizontal: 10,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
  },
  footerButton: {
    backgroundColor: '#f3f4f6', // light gray
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  continueButton: {
    backgroundColor: defaultColor,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  footerButtonText: {
    color: '#4B5563',
    fontSize: 16,
    fontWeight: '700',
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default EbarimtScreen;
