import React from 'react';
import { Controller, Control } from 'react-hook-form';
import { TextInput } from 'react-native-paper';
import { StyleProp, TextStyle } from 'react-native';

type Props = {
  control: Control<any>;
  name: string;
  label?: string;
  mode?: 'flat' | 'outlined';
  style?: StyleProp<TextStyle>;
  right?: React.ReactNode;
  keyboardType?: any;
  [key: string]: any;
};

const RegisterForm = ({ control, name, label, mode = 'outlined', style, right, keyboardType, ...rest }: Props) => {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <TextInput
          label={label}
          value={value}
          onChangeText={onChange}
          mode={mode}
          style={style}
          error={!!error}
          right={right}
          keyboardType={keyboardType}
          {...rest}
        />
      )}
    />
  );
};

export default RegisterForm;
