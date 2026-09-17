import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { accentColor, defaultColor } from '@/src/constants/Colors';
import { useThemeStore } from '@/src/store/theme.store';

const PlanExpired = ({ onRetry }: { onRetry: () => Promise<unknown> }) => {
  const { theme } = useThemeStore();
  const [checking, setChecking] = useState(false);

  const handleRetry = async () => {
    setChecking(true);
    try {
      await onRetry();
    } catch {
      // stay on this screen; the query's onError re-renders it
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={[styles.overlay, { backgroundColor: theme.background }]}>
      <Text variant="headlineSmall" style={[styles.title, { color: theme.text }]}>
        Үйлчилгээний эрх идэвхгүй байна 🙂
      </Text>
      <Text style={[styles.message, { color: theme.textSecondary }]}>
        Энэ төхөөрөмжид идэвхтэй үйлчилгээний багц алга байна. Үйлчилгээг үргэлжлүүлэхийн тулд ажилтантай холбогдоно уу.
      </Text>
      <Button
        mode="contained"
        buttonColor={defaultColor}
        textColor={accentColor}
        loading={checking}
        disabled={checking}
        onPress={handleRetry}
      >
        Дахин шалгах
      </Button>
    </View>
  );
};

export default PlanExpired;

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    zIndex: 99,
  },
  title: {
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
});
