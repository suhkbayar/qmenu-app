import { defaultColor } from '@/src/constants/Colors';
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

interface Props {
  visible: boolean;
  opacity?: number;
}

const OpacityLoader: React.FC<Props> = ({ visible, opacity = 0.7 }) => {
  if (!visible) return null;

  return (
    <View style={[styles.container, { opacity }]}>
      <View style={styles.inner}>
        <ActivityIndicator size="large" color={defaultColor} />
      </View>
    </View>
  );
};

export default OpacityLoader;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  inner: {
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
