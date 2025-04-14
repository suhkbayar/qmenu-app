import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { CURRENCY } from '@/constants';
import { IConfig, IMenuVariant } from '@/types';

interface Props {
  variants: IMenuVariant[];
  config?: IConfig;
}

export const CalculateProductPrice: React.FC<Props> = ({ variants, config }) => {
  if (!variants || variants.length === 0) {
    return null;
  }

  const prices: number[] = variants.map((val) => val.salePrice);
  const max: number = Math.max(...prices);
  const min: number = Math.min(...prices);

  const priceText =
    min === max
      ? `${max.toLocaleString()} ${CURRENCY}`
      : `${min.toLocaleString()} ${CURRENCY} - ${max.toLocaleString()} ${CURRENCY}`;

  return <Text style={[styles.priceText, { color: config?.textColor || '#000' }]}>{priceText}</Text>;
};

const styles = StyleSheet.create({
  priceText: {
    fontWeight: '600',
    fontSize: 14,
  },
});
