import { IMenuOption } from '@/src/types';
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

type Props = {
  option: IMenuOption;
  isSelected: boolean;
  onSelect: (option: IMenuOption) => void;
};

const OptionCard = ({ option, isSelected, onSelect }: Props) => (
  <TouchableOpacity onPress={() => onSelect(option)} style={[styles.card, isSelected && styles.selected]}>
    <Text style={styles.text}>{option.name}</Text>
    {option.price > 0 && <Text style={styles.text}>+{option.price} MNT</Text>}
  </TouchableOpacity>
);

export default OptionCard;

const styles = StyleSheet.create({
  card: { padding: 16, margin: 8, borderRadius: 8, backgroundColor: '#f5f5f5' },
  selected: { backgroundColor: '#f8c542' },
  text: { fontSize: 16 },
});
