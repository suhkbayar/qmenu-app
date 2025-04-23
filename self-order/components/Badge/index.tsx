import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface CustomBadgeProps {
  value?: number | string;
  color?: string;
  backgroundColor?: string;
  size?: number;
  style?: ViewStyle;
  textStyle?: TextStyle;
  show?: boolean;
}

const CustomBadge: React.FC<CustomBadgeProps> = ({
  value,
  color = '#fff',
  backgroundColor = '#EB1833',
  style,
  textStyle,
  show = true,
}) => {
  if (!show) return null;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { color, fontSize: 14 }, textStyle]}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    position: 'absolute',
    top: -4,
    borderRadius: 999,
    right: -4,
    borderColor: 'white',
    borderWidth: 2,
  },
  text: {
    fontWeight: 'bold',
  },
});

export default CustomBadge;
