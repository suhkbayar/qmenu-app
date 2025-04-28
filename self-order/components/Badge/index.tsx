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

// Memoize the badge component to prevent unnecessary re-renders
const CustomBadge = memo(
  ({ value, color = '#fff', backgroundColor = '#EB1833', style, textStyle, show = true }: CustomBadgeProps) => {
    if (!show) return null;

    // Prepare the font size based on value length - helps with large numbers
    const fontSize = React.useMemo(() => {
      // If value is a number and greater than 99, use smaller font
      if (typeof value === 'number' && value > 99) {
        return 12;
      }

      // If value is a string and longer than 2 characters, use smaller font
      if (typeof value === 'string' && value.length > 2) {
        return 12;
      }

      return 14;
    }, [value]);

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
        <Text style={[styles.text, { color, fontSize }, textStyle]} numberOfLines={1}>
          {value}
        </Text>
      </View>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if these props change
    return (
      prevProps.value === nextProps.value &&
      prevProps.show === nextProps.show &&
      prevProps.color === nextProps.color &&
      prevProps.backgroundColor === nextProps.backgroundColor &&
      JSON.stringify(prevProps.style) === JSON.stringify(nextProps.style) &&
      JSON.stringify(prevProps.textStyle) === JSON.stringify(nextProps.textStyle)
    );
  },
);

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
