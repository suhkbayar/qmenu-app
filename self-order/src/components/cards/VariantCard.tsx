import { IMenuVariant } from '@/src/types';
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

type Props = {
  variant: IMenuVariant;
  selectedVariant?: IMenuVariant;
  onSelect: (variant: IMenuVariant) => void;
};

const VariantCard = ({ variant, selectedVariant, onSelect }: Props) => {
  const isSelected = selectedVariant?.id === variant.id;

  return (
    <TouchableOpacity onPress={() => onSelect(variant)} style={[styles.card, isSelected && styles.selected]}>
      <Text style={styles.text}>{variant.name}</Text>
      <Text style={styles.text}>{variant.price} MNT</Text>
    </TouchableOpacity>
  );
};

export default VariantCard;

const styles = StyleSheet.create({
  card: { padding: 16, margin: 8, borderRadius: 8, backgroundColor: '#f5f5f5' },
  selected: { backgroundColor: '#f8c542' },
  text: { fontSize: 16 },
});
