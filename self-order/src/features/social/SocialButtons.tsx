import * as Haptics from 'expo-haptics';
import { Gift, UsersRound } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useCSSVariable } from 'uniwind';
import { ActionButton } from '@/src/ui/ActionButton';
import { useSocialStore } from './socialStore';

const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

// Static on purpose: an endless attention animation keeps the tablet redrawing all day

/** "Gift" in the top bar: send a dish to another table. */
export const GiftButton = () => {
  const { t } = useTranslation('language');
  const openComposer = useSocialStore((s) => s.openComposer);
  const color = useCSSVariable('--color-gift') as string;

  return (
    <ActionButton
      tile={{ Icon: Gift, color }}
      label={t('mainPage.header_gift_label', 'Gift')}
      onPress={() => {
        tap();
        openComposer('gift');
      }}
    />
  );
};

/** "Sit together" in the top bar: invite another table. */
export const SitTogetherButton = () => {
  const { t } = useTranslation('language');
  const openComposer = useSocialStore((s) => s.openComposer);
  const color = useCSSVariable('--color-sit') as string;

  return (
    <ActionButton
      tile={{ Icon: UsersRound, color }}
      label={t('mainPage.sit_action', 'Sit together')}
      onPress={() => {
        tap();
        openComposer('sit');
      }}
    />
  );
};
