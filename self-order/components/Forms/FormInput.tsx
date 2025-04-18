// components/FormInput.tsx
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Icon, TextInput } from 'react-native-paper';
import { Controller, Control, FieldValues, RegisterOptions } from 'react-hook-form';

interface FormInputProps {
  name: string;
  control: Control<FieldValues, any, FieldValues>;
  label: string;
  rules?: RegisterOptions;
  mode?: 'outlined' | 'flat';
  defaultColor?: string;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  right?: React.ReactNode;
}

const FormInput: React.FC<FormInputProps> = ({
  name,
  control,
  label,
  rules,
  mode,
  defaultColor = '#1ecb84',
  placeholder,
  keyboardType = 'default',
  right,
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
            right={right}
            textColor={defaultColor}
            selectionColor={defaultColor}
            underlineColor={defaultColor}
            activeUnderlineColor={defaultColor}
            activeOutlineColor={defaultColor}
            outlineColor={defaultColor}
            placeholderTextColor={defaultColor}
            autoComplete="off"
            textContentType="none"
            autoCorrect={false}
            keyboardType={keyboardType}
            autoCapitalize="none"
            placeholder={placeholder}
            style={[styles.input, error && styles.errorInput]}
            theme={{ colors: { primary: defaultColor } }}
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
  input: {
    marginBottom: 12,
  },
  errorInput: {
    borderColor: 'red',
  },
});

export default FormInput;
