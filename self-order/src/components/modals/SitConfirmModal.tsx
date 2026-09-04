import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Portal } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useGiftTheme } from '@/src/hooks/useGiftTheme';
import Medallion from '@/src/components/ui/Medallion';
import { ITable } from '@/src/types/table';

type Props = {
  /** The staged table, or null when nothing is awaiting confirmation. */
  table: ITable | null;
  sending: boolean;
  onCancel: () => void;
  onConfirm: (table: ITable) => void;
};

/**
 * Confirms a sit-together invitation before it goes out.
 *
 * Goes through a Portal: the picker's modal content container is sized to its
 * card, so an overlay rendered inside it would only darken the card, not the
 * screen. The Portal host is full-screen and mounts above the open modal.
 */
const SitConfirmModal = ({ table, sending, onCancel, onConfirm }: Props) => {
  const { t } = useTranslation('language');
  const g = useGiftTheme();

  if (!table) return null;

  return (
    <Portal>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: g.surface, borderColor: g.hairline }]}>
          <Medallion glyph="account-multiple" size={64} solid />

          <Text style={[styles.title, { color: g.text }]}>
            {t('mainPage.sit_confirm_title', {
              table: table.name,
              defaultValue: `Send a sit-together request to Table ${table.name}?`,
            })}
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={onCancel}
              disabled={sending}
              activeOpacity={0.7}
              style={[styles.ghost, { borderColor: g.hairline }]}
            >
              <Text style={[styles.ghostText, { color: g.goldText }]}>{t('mainPage.No', 'No')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onConfirm(table)}
              disabled={sending}
              activeOpacity={0.85}
              style={[styles.primary, { backgroundColor: g.gold, opacity: sending ? 0.6 : 1 }]}
            >
              <Text style={[styles.primaryText, { color: g.onGold }]}>{t('mainPage.Yes', 'Yes')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Portal>
  );
};

export default SitConfirmModal;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 30,
    paddingVertical: 28,
  },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center', lineHeight: 33, marginTop: 18 },

  actions: { flexDirection: 'row', alignSelf: 'stretch', gap: 14, marginTop: 26 },
  ghost: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 62,
    borderRadius: 16,
    borderWidth: 1,
  },
  ghostText: { fontSize: 19, fontWeight: '700' },
  primary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 62,
    borderRadius: 16,
  },
  primaryText: { fontSize: 20, fontWeight: '800' },
});
