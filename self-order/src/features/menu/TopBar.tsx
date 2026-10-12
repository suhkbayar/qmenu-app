import { memo } from 'react';
import { View } from 'react-native';
import { useThemeColor } from 'heroui-native';
import { Bell, Settings } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { SecretTap } from '@/src/features/kiosk/AdminExit';
import { useSessionStore } from '@/src/features/session/sessionStore';
import { GiftButton, SitTogetherButton } from '@/src/features/social/SocialButtons';
import { ActionButton } from '@/src/ui/ActionButton';
import { Flag } from '@/src/ui/Flag';
import { Image } from '@/src/ui/Image';
import { Text } from '@/src/ui/Text';

type Props = {
  onOpenService: () => void;
  onOpenSettings: () => void;
};

/**
 * Full width across the top: the restaurant and table on the left; Gift and Sit together (branches
 * that have them), Service, and at the far end the settings cog (language, light/dark) on the right.
 * The order has its own bar along the bottom. Ten quick taps on the logo open the admin dialog.
 */
export const TopBar = memo(({ onOpenService, onOpenSettings }: Props) => {
  const { t, i18n } = useTranslation('language');
  const [foreground, accentForeground] = useThemeColor(['foreground', 'accent-foreground']);
  const branch = useSessionStore((s) => s.participant?.branch);
  const tableName = useSessionStore((s) => s.participant?.table?.name);
  const giftEnabled = useSessionStore((s) => s.config?.giftOrder === true);
  const sitEnabled = useSessionStore((s) => s.config?.sitTogether === true);

  return (
    <View className="h-20 flex-row items-center gap-3 border-b border-border bg-surface px-6">
      <View className="min-w-0 flex-1 flex-row items-center gap-3.5">
        <SecretTap>
          <Image
            source={branch?.logo ? { uri: branch.logo } : undefined}
            className="size-13 rounded-2xl bg-surface-secondary"
          />
        </SecretTap>
        <View className="min-w-0 shrink gap-0.5">
          <Text className="text-lg font-bold" numberOfLines={1}>
            {branch?.name}
          </Text>
          {!!tableName && (
            <Text className="font-medium text-muted" numberOfLines={1}>
              {t('mainPage.toast_from_table', { table: tableName })}
            </Text>
          )}
        </View>
      </View>

      {giftEnabled && <GiftButton />}
      {sitEnabled && <SitTogetherButton />}
      <ActionButton
        tone="primary"
        label={t('mainPage.service')}
        icon={<Bell size={20} color={accentForeground} strokeWidth={2.2} />}
        onPress={onOpenService}
      />
      {/* The flag says the language can be changed here, for a guest who doesn't read Mongolian */}
      <ActionButton
        iconOnly
        label={t('mainPage.settings')}
        icon={
          <View className="flex-row items-center gap-2 px-1">
            <Flag language={i18n.language} width={27} />
            <Settings size={22} color={foreground} />
          </View>
        }
        onPress={onOpenSettings}
      />
    </View>
  );
});
