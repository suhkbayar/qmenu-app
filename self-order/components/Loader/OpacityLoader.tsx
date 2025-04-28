import { defaultColor } from '@/constants/Colors';
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

interface LoaderProps {
  visible: boolean;
  opacity?: number; // Customizable opacity
}

const OpacityLoader: React.FC<LoaderProps> = ({ visible, opacity = 0.7 }) => {
  if (!visible) return null;

  return (
    <View style={[styles.container, { opacity }]}>
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={defaultColor} />
      </View>
    </View>
  );
};

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
  loaderContainer: {
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    color: '#FFFFFF',
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OpacityLoader;
