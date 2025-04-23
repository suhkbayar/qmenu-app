import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Platform,
  Keyboard,
  ScrollView,
} from 'react-native';
import { Text, Surface, TouchableRipple, Icon, SegmentedButtons, TextInput } from 'react-native-paper';
import { FieldValues, useForm } from 'react-hook-form';
import { useOrder } from '@/providers/OrderProvider';
import { router, useLocalSearchParams } from 'expo-router';
import { useLazyQuery } from '@apollo/client';
import { GET_VAT_PAYER } from '@/graphql/query/vat';
import { defaultColor } from '@/constants/Colors';
import { useToast } from 'react-native-toast-notifications';
import { useTranslation } from 'react-i18next';
import { validPrefixes } from '@/constants';
import PaperDropdown from '@/components/Dropdown';
import RegisterForm from '@/components/Forms/RegisterForm';
import { isEmpty } from 'lodash';

const EbarimtScreen = () => {
  const toast = useToast();
  const { t } = useTranslation('language');
  const { orderId } = useLocalSearchParams();
  const { orderState, setOrderState } = useOrder();

  const [isError, setIsError] = useState<boolean>(false);
  const [companyType, setCompanyType] = useState<string>('company');

  const { control, setValue, reset, watch } = useForm<FieldValues>({
    mode: 'all',
    defaultValues: {
      vatType: '1',
    },
  });

  const { vatType, buyer, fistLetter, secondLetter, personRegister, companyRegister } = watch();

  const [getVatPayer, { loading }] = useLazyQuery(GET_VAT_PAYER, {
    onCompleted(data) {
      setValue('buyer', data.getVatPayer.name);
      setIsError(false);
      if (!data.getVatPayer.found) {
        reset({
          buyer: null,
        });
      }
    },
    onError(err) {
      setIsError(true);
      toast.show(err.message, {
        type: 'warning',
        icon: <Icon source="alert-circle-outline" size={30} color="#fff" />,
        placement: 'top',
        warningColor: defaultColor,
        duration: 4000,
        animationType: 'slide-in',
      });
    },
  });

  const onSubmit = () => {
    const isCompanyValid = companyType === 'company' && companyRegister?.length === 7;
    const isPersonValid = companyType === 'person' && personRegister?.length === 8 && fistLetter && secondLetter;

    const targetVat =
      vatType === '1'
        ? { vatType: '1' }
        : !isEmpty(buyer) && (isCompanyValid || isPersonValid)
        ? {
            vatType: '3',
            buyer,
            register: isCompanyValid ? companyRegister : `${fistLetter}${secondLetter}${personRegister}`,
          }
        : {};

    setOrderState((prev) => ({ ...prev, ...targetVat }));

    router.push({
      pathname: '/private/payment',
      params: { orderId },
    });
  };

  const onChangeSegmen = (value: any) => {
    setCompanyType(value);
    setValue('companyRegister', null);
    setValue('personRegister', null);
    setValue('fistLetter', null);
    setValue('secondLetter', null);
    setValue('buyer', null);
  };

  useEffect(() => {
    if (vatType === '3') {
      if (companyType === 'company') {
        if (companyRegister?.length === 7) {
          setIsError(false);
          getVatPayer({
            variables: {
              register: `${companyRegister}`,
            },
          });
        } else if (!isEmpty(companyRegister)) {
          setIsError(true);
        }

        if (companyRegister?.length < 7) {
          setValue('buyer', null);
        } else if (companyRegister?.length > 7) {
          setValue('buyer', null);
        }
      }
    }
  }, [vatType, companyType, companyRegister]);

  useEffect(() => {
    if (vatType === '3') {
      if (companyType === 'person') {
        if (personRegister?.length === 8 && !isEmpty(fistLetter) && !isEmpty(secondLetter)) {
          setIsError(false);
          getVatPayer({
            variables: {
              register: `${fistLetter}${secondLetter}${personRegister}`,
            },
          });
        } else if (!isEmpty(personRegister)) {
          setIsError(true);
        }

        if (personRegister?.length < 8) {
          setValue('buyer', null);
        } else if (personRegister?.length > 8) {
          setValue('buyer', null);
        }
      }
    }
  }, [vatType, companyType, personRegister, fistLetter, secondLetter]);

  const onSelect = (vatValue: any) => {
    setValue('vatType', vatValue);
  };

  const options = validPrefixes.map((prefix) => ({
    label: prefix,
    value: prefix,
  }));

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            <View style={{ flex: 1 }}>
              <View style={styles.logoContainer}>
                <Image
                  source={require('../../assets/icon/eBarimt_logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
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
                      <Text style={[vatType === '3' ? styles.activeCardText : styles.cardText]}>Татвар төлөгч</Text>
                    </View>
                  </TouchableRipple>
                </Surface>
              </View>
              {vatType === '3' && (
                <View>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'center',
                      marginVertical: 8,
                    }}
                  >
                    <Text style={styles.subtitle}>Татвар төлөгчийн төрөл</Text>
                  </View>
                  <View style={styles.cardContainer}>
                    <SegmentedButtons
                      value={companyType}
                      onValueChange={onChangeSegmen}
                      density="regular"
                      theme={{ colors: { primary: 'green', borderRadius: 10 } }}
                      style={{ marginTop: 6, width: '42%', borderRadius: 10 }}
                      buttons={[
                        {
                          value: 'company',
                          checkedColor: 'white',
                          uncheckedColor: '#525252',
                          labelStyle: {
                            fontSize: 16,
                            fontWeight: 'bold',
                          },
                          style: {
                            borderRadius: 12,
                            paddingVertical: 10,
                            backgroundColor: companyType === 'company' ? defaultColor : '#efefef',
                            borderColor: 'transparent',
                          },
                          label: 'Байгууллага',
                        },
                        {
                          value: 'person',
                          checkedColor: 'white',
                          uncheckedColor: '#525252',
                          labelStyle: {
                            fontSize: 16,
                            fontWeight: 'bold',
                          },
                          style: {
                            borderRadius: 12,
                            paddingVertical: 10,
                            backgroundColor: companyType === 'person' ? defaultColor : '#efefef',
                            borderColor: 'transparent',
                          },
                          label: 'Иргэн',
                        },
                      ]}
                    />
                  </View>

                  {companyType === 'company' ? (
                    <View style={styles.inputContainer}>
                      <RegisterForm
                        control={control}
                        style={{ width: '42%' }}
                        name="companyRegister"
                        label="Байгууллагын регистрийн дугаар "
                        mode="outlined"
                        keyboardType="numeric"
                        right={
                          isError ? (
                            <TextInput.Icon icon="alert-circle-outline" color="#9b1c1c" />
                          ) : !isEmpty(buyer) ? (
                            <TextInput.Icon icon="check-circle-outline" color="#1ecb84" />
                          ) : (
                            loading && <TextInput.Icon icon="loading" color={defaultColor} />
                          )
                        }
                      />
                    </View>
                  ) : (
                    <View style={styles.inputContainer}>
                      <PaperDropdown
                        option={fistLetter}
                        options={options}
                        onSelect={(value) => setValue('fistLetter', value)}
                      />

                      <PaperDropdown
                        option={secondLetter}
                        options={options}
                        onSelect={(value) => setValue('secondLetter', value)}
                      />
                      <RegisterForm
                        control={control}
                        style={{ width: '28%' }}
                        name="personRegister"
                        label="Регистрийн дугаар "
                        mode="outlined"
                        keyboardType="numeric"
                        right={
                          isError ? (
                            <TextInput.Icon icon="alert-circle-outline" color="#9b1c1c" />
                          ) : !isEmpty(buyer) ? (
                            <TextInput.Icon icon="check-circle-outline" color="#1ecb84" />
                          ) : (
                            loading && <TextInput.Icon icon="loading" color={defaultColor} />
                          )
                        }
                      />
                    </View>
                  )}
                  {!isEmpty(buyer) && (
                    <View style={styles.inputContainer}>
                      <RegisterForm
                        control={control}
                        style={{ width: '42%' }}
                        name="buyer"
                        label={` ${companyType === 'company' ? 'Байгууллагын нэр' : 'Татвар төлөгчийн нэр'}   `}
                        mode="outlined"
                        keyboardType="numeric"
                        isRead
                      />
                    </View>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.footerButton} onPress={() => router.back()}>
          <Text style={styles.footerButtonText}>{t('mainPage.GoBack')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={vatType === '3' && isEmpty(buyer) ? styles.disableButton : styles.continueButton}
          disabled={vatType === '3' && isEmpty(buyer)}
          onPress={onSubmit}
        >
          <Text style={styles.continueButtonText}>{t('mainPage.Confirmation')}</Text>
        </TouchableOpacity>
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
  inputContainer: {
    marginTop: 10,
    gap: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
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
  disableButton: {
    backgroundColor: '#f0f0f0',
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
