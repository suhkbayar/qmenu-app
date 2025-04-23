import React, { useState } from 'react';
import { View } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';

interface ValueType {
  label: string;
  value: string;
}

type Props = {
  option: ValueType;
  options: ValueType[];
  onSelect: (value: string) => void;
};

const PaperDropdown = ({ option, options, onSelect }: Props) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(null);
  const [items, setItems] = useState(options);

  return (
    <View
      style={{
        width: '6%',
        alignContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
      }}
    >
      <DropDownPicker
        open={open}
        value={value}
        style={{
          marginTop: 4,
          borderColor: '#c9c9c9',
        }}
        items={items}
        setOpen={setOpen}
        listMode="SCROLLVIEW"
        dropDownDirection="AUTO"
        dropDownContainerStyle={{
          borderColor: '#c9c9c9',
        }}
        setValue={setValue}
        setItems={setItems}
        placeholder={''}
        onChangeValue={(val) => {
          if (val) onSelect(val);
        }}
      />
    </View>
  );
};

export default PaperDropdown;
