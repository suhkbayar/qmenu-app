import React, { memo } from 'react';
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

const CustomBadge = memo(
  ({ value, color = '#fff', backgroundColor = '#EB1833', style, textStyle, show = true }: CustomBadgeProps) => {
    if (!show) return null;

    const fontSize = React.useMemo(() => {
      if (typeof value === 'number' && value > 99) return 12;
      if (typeof value === 'string' && value.length > 2) return 12;
      return 14;
    }, [value]);

    return (
      <View style={[styles.badge, { backgroundColor }, style]}>
        <Text style={[styles.text, { color, fontSize }, textStyle]} numberOfLines={1}>
          {value}
        </Text>
      </View>
    );
  },
  (prev, next) =>
    prev.value === next.value &&
    prev.show === next.show &&
    prev.color === next.color &&
    prev.backgroundColor === next.backgroundColor &&
    JSON.stringify(prev.style) === JSON.stringify(next.style) &&
    JSON.stringify(prev.textStyle) === JSON.stringify(next.textStyle),
);

const styles = StyleSheet.create({
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    position: 'absolute',
    top: -4,
    right: -4,
    borderRadius: 999,
    borderColor: 'white',
    borderWidth: 2,
  },
  text: {
    fontWeight: 'bold',
  },
});

export default CustomBadge;
