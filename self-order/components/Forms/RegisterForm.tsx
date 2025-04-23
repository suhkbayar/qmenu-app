// components/RegisterForm.tsx
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { TextInput } from 'react-native-paper';
import { Controller, Control, FieldValues, RegisterOptions } from 'react-hook-form';
import { defaultColor } from '@/constants/Colors';

interface FormInputProps {
  name: string;
  control: Control<FieldValues, any, FieldValues>;
  label: string;
  rules?: RegisterOptions;
  mode?: 'outlined' | 'flat';
  placeholder?: string;
  style?: any;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  right?: React.ReactNode;
  isRead?: boolean;
}

const RegisterForm: React.FC<FormInputProps> = ({
  name,
  control,
  label,
  rules,
  mode,
  style,
  placeholder,
  keyboardType = 'default',
  right,
  isRead = false,
}) => {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <>
          <TextInput
            label={label}
            value={value?.toString() || ''}
            onChangeText={onChange}
            onBlur={onBlur}
            mode={mode}
            autoComplete="off"
            right={right}
            readOnly={isRead}
            textContentType="none"
            autoCorrect={false}
            keyboardType={keyboardType}
            autoCapitalize="none"
            placeholder={placeholder}
            style={[style, error && styles.errorInput]}
            theme={{
              colors: {
                primary: defaultColor,
                outline: '#c9c9c9',
                background: '#fff',
              },
              roundness: 10,
            }}
            error={!!error}
          />
          {error && (
            <View>
              <Text style={{ color: 'red', fontSize: 12, marginBottom: 8 }}>{error?.message}</Text>
            </View>
          )}
        </>
      )}
    />
  );
};

const styles = StyleSheet.create({
  errorInput: {
    borderColor: 'red',
  },
});

export default RegisterForm;
