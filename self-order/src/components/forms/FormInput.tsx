import React from 'react';
import { Controller, Control } from 'react-hook-form';
import { TextInput } from 'react-native-paper';

type Props = {
  control: Control<any>;
  name: string;
  label?: string;
  mode?: 'flat' | 'outlined';
  right?: React.ReactNode;
  defaultColor?: string;
  [key: string]: any;
};

const FormInput = ({ control, name, label, mode = 'outlined', right, defaultColor, ...rest }: Props) => {
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
          error={!!error}
          right={right}
          activeOutlineColor={defaultColor}
          {...rest}
        />
      )}
    />
  );
};

export default FormInput;
