import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import Medallion from '@/src/components/ui/Medallion';
import { useGiftTheme } from '@/src/hooks/useGiftTheme';
import { useTableMessageStore } from '@/src/store/tableMessage.store';

const SitTogetherButton = () => {
  const { t } = useTranslation('language');
  const g = useGiftTheme();
  const openSitComposer = useTableMessageStore((s) => s.openSitComposer);

  const open = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    openSitComposer();
  };

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: g.raised, borderColor: g.hairline }]}
        onPress={open}
        activeOpacity={0.8}
      >
        <Medallion glyph="account-multiple" size={34} solid />
        <Text style={[styles.label, { color: g.text }]}>{t('mainPage.sit_action', 'Sit together')}</Text>
      </TouchableOpacity>
    </View>
  );
};

export default SitTogetherButton;

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
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
