import { IMenuVariant } from '@/types';
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
    <TouchableOpacity onPress={() => onSelect(variant)} style={[styles.card, isSelected && styles.selectedCard]}>
      <Text style={styles.text}>{variant.name}</Text>
      <Text style={styles.text}>{variant.price} MNT</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    margin: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  selectedCard: {
    backgroundColor: '#f8c542',
  },
  text: {
    fontSize: 16,
  },
});

export default VariantCard;
