import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withDelay,
  withTiming,
  cancelAnimation,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { useGiftTheme } from '@/src/hooks/useGiftTheme';
import { useTableMessageStore } from '@/src/store/tableMessage.store';
import Medallion from '@/src/components/ui/Medallion';

const BREATH_MS = 1500;
const REST_MS = 3600;

const GiftHeaderButton = () => {
  const { t } = useTranslation('language');
  const g = useGiftTheme();
  const openComposer = useTableMessageStore((s) => s.openComposer);
  const composerOpen = useTableMessageStore((s) => s.composerOpen);

  const ring = useSharedValue(0);

  useEffect(() => {
    ring.value = withRepeat(
      withSequence(
        withTiming(1, { duration: BREATH_MS, easing: Easing.out(Easing.quad) }),
        withDelay(REST_MS, withTiming(0, { duration: 0 })),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(ring);
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ring.value, [0, 0.15, 1], [0, 0.45, 0]),
    transform: [{ scale: interpolate(ring.value, [0, 1], [0.9, 1.28]) }],
  }));

  const sealStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ring.value, [0, 0.18, 1], [1, 1.07, 1]) }],
  }));

  const open = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    openComposer();
  };

  return (
    <View style={styles.wrap}>
      {!composerOpen && (
        <Animated.View pointerEvents="none" style={[styles.ring, { borderColor: g.gold }, ringStyle]} />
      )}

      <TouchableOpacity
        style={[styles.button, { backgroundColor: g.raised, borderColor: g.hairline }]}
        onPress={open}
        activeOpacity={0.8}
      >
        <Animated.View style={sealStyle}>
          <Medallion glyph="glass-cocktail" size={34} solid />
        </Animated.View>
        <Text style={[styles.label, { color: g.text }]}>{t('mainPage.header_gift_label', 'Gift')}</Text>
      </TouchableOpacity>
    </View>
  );
};

export default GiftHeaderButton;

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ring: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 2,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 58,
    paddingLeft: 12,
    paddingRight: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
  label: { fontSize: 18, fontWeight: '700', letterSpacing: 0.4 },
});
