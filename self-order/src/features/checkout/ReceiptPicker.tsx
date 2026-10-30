import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useLazyQuery } from '@apollo/client';
import { Tabs, cn, useThemeColor } from 'heroui-native';
import { CircleAlert, CircleCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useCSSVariable } from 'uniwind';
import { GET_VAT_PAYER } from '@/src/graphql/queries/vat';
import { Spinner } from '@/src/ui/Spinner';
import { Text } from '@/src/ui/Text';
import { useNotify } from '@/src/ui/useNotify';
import { Receipt } from './usePayment';

// A company's register number is 7 digits
const COMPANY_REGISTER_LENGTH = 7;

/** Looks up the taxpayer's name once a complete register number is entered. */
const useVatPayer = (register: string | null) => {
  const notify = useNotify();
  const [lookup, { data, loading, variables }] = useLazyQuery(GET_VAT_PAYER, {
    fetchPolicy: 'network-only',
    onError: (err) => notify('warning', err.message),
  });

  useEffect(() => {
    if (register) lookup({ variables: { register } });
  }, [register]);

  // Only judge the result of the lookup for this exact number
  const done = !!register && !loading && variables?.register === register;
  const name: string | null = done && data?.getVatPayer?.found ? data.getVatPayer.name : null;
  return { name, loading: !!register && !done, notFound: done && !name };
};

/** The eBarimt choice in checkout: personal, or a company found by its register number. */
export const useReceipt = () => {
  const [vatType, setVatType] = useState<'1' | '3'>('1');
  const [companyRegister, setCompanyRegister] = useState('');

  const register = companyRegister.length === COMPANY_REGISTER_LENGTH ? companyRegister : null;
  const payer = useVatPayer(vatType === '3' ? register : null);

  return {
    vatType,
    setVatType,
    companyRegister,
    setCompanyRegister,
    payer,
    /** Payment can start: a personal receipt, or a taxpayer that was found */
    ready: vatType === '1' || !!payer.name,
    receipt: (vatType === '1' ? { vatType: '1' } : { vatType: '3', register: register ?? undefined }) as Receipt,
  };
};

type ReceiptState = ReturnType<typeof useReceipt>;

/** И-Баримт and a personal / company switch on one row; for a company, its register number and name. */
export const ReceiptPicker = ({ receipt }: { receipt: ReceiptState }) => {
  const { t } = useTranslation('language');
  const { payer } = receipt;
  const status = payer.loading ? 'loading' : payer.name ? 'found' : payer.notFound ? 'error' : undefined;

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between gap-4">
        <Text className="text-lg font-bold">{t('mainPage.eBarimt')}</Text>
        <Tabs
          value={receipt.vatType}
          onValueChange={(value) => receipt.setVatType(value as '1' | '3')}
          className="w-95"
        >
          <Tabs.List className="w-full">
            <Tabs.Indicator />
            <Tabs.Trigger value="1" className="flex-1">
              <Tabs.Label numberOfLines={1}>{t('mainPage.Individual')}</Tabs.Label>
            </Tabs.Trigger>
            <Tabs.Trigger value="3" className="flex-1">
              <Tabs.Label numberOfLines={1}>{t('mainPage.Institution')}</Tabs.Label>
            </Tabs.Trigger>
          </Tabs.List>
        </Tabs>
      </View>

      {/* A company: its register number, and the company's name once it's found */}
      {receipt.vatType === '3' && (
        <View className="gap-2.5">
          <View className="flex-row">
            <RegisterInput
              value={receipt.companyRegister}
              onChange={receipt.setCompanyRegister}
              maxLength={COMPANY_REGISTER_LENGTH}
              placeholder={t('mainPage.OrganizationalRegisters')}
              status={status}
            />
          </View>
          {!!payer.name && (
            <Text className="font-semibold text-positive" numberOfLines={1}>
              {payer.name}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const RegisterInput = ({
  value,
  onChange,
  maxLength,
  placeholder,
  status,
}: {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  placeholder: string;
  status?: 'loading' | 'found' | 'error';
}) => {
  const [muted, foreground, danger] = useThemeColor(['muted', 'foreground', 'danger']);
  const positive = useCSSVariable('--color-positive') as string;
  return (
    <View
      className={cn(
        'h-14 flex-1 flex-row items-center gap-3 rounded-2xl border-2 bg-surface px-4',
        status === 'error' ? 'border-danger' : status === 'found' ? 'border-positive' : 'border-border',
      )}
    >
      <TextInput
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, ''))}
        keyboardType="number-pad"
        maxLength={maxLength}
        placeholder={placeholder}
        placeholderTextColor={muted}
        className="flex-1 font-semibold text-lg"
        // Typed text in the theme's colour through style; unset, Android draws it black
        style={{ color: foreground }}
      />
      {status === 'loading' && <Spinner />}
      {status === 'found' && <CircleCheck size={22} color={positive} />}
      {status === 'error' && <CircleAlert size={22} color={danger} />}
    </View>
  );
};
