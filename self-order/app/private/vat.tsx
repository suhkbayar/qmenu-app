import React, { useEffect, useState } from 'react';
import {
  Image, Keyboard, KeyboardAvoidingView, Platform,
  SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, View,
} from 'react-native';
import { Icon, SegmentedButtons, Surface, Text, TextInput, TouchableRipple } from 'react-native-paper';
import { FieldValues, useForm } from 'react-hook-form';
import { useLocalSearchParams, router } from 'expo-router';
import { useLazyQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { useToast } from 'react-native-toast-notifications';
import { isEmpty } from 'lodash';

import PaperDropdown from '@/src/components/ui/Dropdown';
import RegisterForm from '@/src/components/forms/RegisterForm';
import { defaultColor } from '@/src/constants/Colors';
import { useThemeStore } from '@/src/store/theme.store';
import { validPrefixes } from '@/src/constants';
import { GET_VAT_PAYER } from '@/src/graphql/queries/vat';
import { useOrderStore } from '@/src/store/order.store';

const VatScreen = () => {
  const { t } = useTranslation('language');
  const toast = useToast();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const setOrderState = useOrderStore((state) => state.setOrderState);

  const { theme } = useThemeStore();
  const [isError, setIsError] = useState(false);
  const [companyType, setCompanyType] = useState('company');

  const { control, setValue, reset, watch } = useForm<FieldValues>({
    mode: 'all',
    defaultValues: { vatType: '1' },
  });

  const { vatType, buyer, fistLetter, secondLetter, personRegister, companyRegister } = watch();

  const [getVatPayer, { loading }] = useLazyQuery(GET_VAT_PAYER, {
    onCompleted(data) {
      setValue('buyer', data.getVatPayer.name);
      setIsError(false);
      if (!data.getVatPayer.found) reset({ buyer: null });
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

  // Lookup VAT payer whenever relevant fields change
  useEffect(() => {
    if (vatType !== '3') return;

    if (companyType === 'company') {
      if (companyRegister?.length === 7) {
        setIsError(false);
        getVatPayer({ variables: { register: companyRegister } });
      } else {
        if (!isEmpty(companyRegister)) setIsError(true);
        setValue('buyer', null);
      }
    } else {
      if (personRegister?.length === 8 && !isEmpty(fistLetter) && !isEmpty(secondLetter)) {
        setIsError(false);
        getVatPayer({ variables: { register: `${fistLetter}${secondLetter}${personRegister}` } });
      } else {
        if (!isEmpty(personRegister)) setIsError(true);
        setValue('buyer', null);
      }
    }
  }, [vatType, companyType, companyRegister, personRegister, fistLetter, secondLetter]);

  const onSubmit = () => {
    const isCompanyValid = companyType === 'company' && companyRegister?.length === 7;
    const isPersonValid = companyType === 'person' && personRegister?.length === 8 && fistLetter && secondLetter;

    const vatData =
      vatType === '1'
        ? { vatType: '1' }
        : !isEmpty(buyer) && (isCompanyValid || isPersonValid)
        ? { vatType: '3', buyer, register: isCompanyValid ? companyRegister : `${fistLetter}${secondLetter}${personRegister}` }
        : {};

    setOrderState((prev) => ({ ...prev, ...vatData }));
    router.push({ pathname: '/private/payment', params: { orderId } });
  };

  const onChangeSegment = (value: string) => {
    setCompanyType(value);
    ['companyRegister', 'personRegister', 'fistLetter', 'secondLetter', 'buyer'].forEach((f) => setValue(f, null));
  };

  const rightIcon = isError
    ? <TextInput.Icon icon="alert-circle-outline" color="#9b1c1c" />
    : !isEmpty(buyer)
    ? <TextInput.Icon icon="check-circle-outline" color="#1ecb84" />
    : loading
    ? <TextInput.Icon icon="loading" color={theme.primary} />
    : undefined;

  const prefixOptions = validPrefixes.map((p) => ({ label: p, value: p }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.fill}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.logoContainer}>
              <Image source={require('../../assets/icon/eBarimt_logo.png')} style={styles.logo} resizeMode="contain" />
              <Text style={[styles.subtitle, { color: theme.textMuted }]}>{t('mainPage.VATreceipt')}</Text>
            </View>

            <View style={styles.cardRow}>
              {(['1', '3'] as const).map((type) => (
                <Surface key={type} style={[styles.card, { backgroundColor: theme.backgroundSecondary }, vatType === type && { backgroundColor: theme.primary }]}>
                  <TouchableRipple onPress={() => setValue('vatType', type)} style={styles.cardTouch} borderless>
                    <View style={styles.cardInner}>
                      <Icon
                        source={type === '1' ? 'account-outline' : 'bank'}
                        size={60}
                        color={vatType === type ? 'white' : theme.textMuted}
                      />
                      <Text style={[styles.cardText, { color: theme.textSecondary }, vatType === type && styles.activeCardText]}>
                        {type === '1' ? t('mainPage.Individual') : t('mainPage.tax_payer')}
                      </Text>
                    </View>
                  </TouchableRipple>
                </Surface>
              ))}
            </View>

            {vatType === '3' && (
              <View>
                <View style={styles.centerRow}>
                  <Text style={[styles.subtitle, { color: theme.textMuted }]}>{t('mainPage.taxpayer_type')}</Text>
                </View>

                <View style={styles.cardRow}>
                  <SegmentedButtons
                    value={companyType}
                    onValueChange={onChangeSegment}
                    style={styles.segmented}
                    theme={{ colors: { primary: 'green' } }}
                    buttons={[
                      {
                        value: 'company',
                        label: t('mainPage.Institution'),
                        checkedColor: 'white',
                        uncheckedColor: theme.textMuted,
                        labelStyle: styles.segLabel,
                        style: { ...styles.segBtn, backgroundColor: companyType === 'company' ? theme.primary : theme.backgroundSecondary },
                      },
                      {
                        value: 'person',
                        label: t('mainPage.citizen'),
                        checkedColor: 'white',
                        uncheckedColor: theme.textMuted,
                        labelStyle: styles.segLabel,
                        style: { ...styles.segBtn, backgroundColor: companyType === 'person' ? theme.primary : theme.backgroundSecondary },
                      },
                    ]}
                  />
                </View>

                <View style={styles.inputRow}>
                  {companyType === 'company' ? (
                    <RegisterForm
                      control={control}
                      style={styles.inputWide}
                      name="companyRegister"
                      label={t('mainPage.OrganizationalRegisters')}
                      mode="outlined"
                      keyboardType="numeric"
                      right={rightIcon}
                    />
                  ) : (
                    <>
                      <PaperDropdown option={fistLetter} options={prefixOptions} onSelect={(v) => setValue('fistLetter', v)} />
                      <PaperDropdown option={secondLetter} options={prefixOptions} onSelect={(v) => setValue('secondLetter', v)} />
                      <RegisterForm
                        control={control}
                        style={styles.inputNarrow}
                        name="personRegister"
                        label={t('mainPage.enter_registration_number')}
                        mode="outlined"
                        keyboardType="numeric"
                        right={rightIcon}
                      />
                    </>
                  )}
                </View>

                {!isEmpty(buyer) && (
                  <View style={styles.inputRow}>
                    <RegisterForm
                      control={control}
                      style={styles.inputWide}
                      name="buyer"
                      label={companyType === 'company' ? 'Байгууллагын нэр' : 'Татвар төлөгчийн нэр'}
                      mode="outlined"
                      isRead
                    />
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.backgroundSecondary }]} onPress={() => router.back()}>
          <Text style={[styles.backBtnText, { color: theme.textSecondary }]}>{t('mainPage.GoBack')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.continueBtn, { backgroundColor: theme.primary }, vatType === '3' && isEmpty(buyer) && styles.disabledBtn]}
          disabled={vatType === '3' && isEmpty(buyer)}
          onPress={onSubmit}
        >
          <Text style={styles.continueBtnText}>{t('mainPage.Payment')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default VatScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  fill: { flex: 1 },
  scroll: { flexGrow: 1 },
  logoContainer: { alignItems: 'center', marginTop: 40, marginBottom: 8 },
  logo: { width: '100%', height: 100, alignSelf: 'center', marginBottom: 32 },
  subtitle: { fontSize: 18, color: '#666' },
  cardRow: { flexDirection: 'row', justifyContent: 'center', paddingHorizontal: 20 },
  centerRow: { flexDirection: 'row', justifyContent: 'center', marginVertical: 8 },
  card: {
    width: '20%', height: 160, backgroundColor: '#efefef',
    borderRadius: 12, margin: 10, elevation: 2, overflow: 'hidden',
  },
  activeCard: { backgroundColor: defaultColor },
  cardTouch: { flex: 1 },
  cardInner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  cardText: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', color: '#666' },
  activeCardText: { color: 'white' },
  segmented: { marginTop: 6, width: '42%', borderRadius: 10 },
  segLabel: { fontSize: 16, fontWeight: 'bold' },
  segBtn: { borderRadius: 12, paddingVertical: 10, borderColor: 'transparent' },
  inputRow: { marginTop: 10, gap: 8, flexDirection: 'row', justifyContent: 'center', paddingHorizontal: 20 },
  inputWide: { width: '42%' },
  inputNarrow: { width: '28%' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', position: 'absolute', bottom: 20, width: '100%', paddingHorizontal: 20 },
  backBtn: { backgroundColor: '#f3f4f6', paddingVertical: 18, paddingHorizontal: 24, borderRadius: 12 },
  backBtnText: { color: '#4B5563', fontSize: 16, fontWeight: '700' },
  continueBtn: { backgroundColor: defaultColor, paddingVertical: 18, paddingHorizontal: 24, borderRadius: 12 },
  disabledBtn: { backgroundColor: '#f0f0f0' },
  continueBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
