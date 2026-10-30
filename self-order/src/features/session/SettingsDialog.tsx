import { View } from 'react-native';
import { Button, Dialog, PressableFeedback, Switch, cn, useThemeColor } from 'heroui-native';
import { Moon, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useHoldScreensaver } from '@/src/features/kiosk/screensaverHold';
import { Flag } from '@/src/ui/Flag';
import { MotionDialog } from '@/src/ui/MotionDialog';
import { Spinner } from '@/src/ui/Spinner';
import { Text } from '@/src/ui/Text';
import { useThemeStore } from '@/src/ui/themeStore';
import { useLanguage } from './useLanguage';

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

/** The cog in the top bar: the menu's language, and light or dark. */
export const SettingsDialog = ({ isOpen, onOpenChange }: Props) => {
  const { t } = useTranslation('language');
  const { languages, current, change, changing } = useLanguage();
  const foreground = useThemeColor('foreground');
  const isDark = useThemeStore((s) => s.isDark);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  useHoldScreensaver(isOpen);

  return (
    <MotionDialog isOpen={isOpen} onOpenChange={onOpenChange} className="w-150 gap-6 p-7">
      <View className="flex-row items-center justify-between">
        <Dialog.Title className="text-[28px] font-bold">{t('mainPage.settings')}</Dialog.Title>
        {changing ? (
          <Spinner />
        ) : (
          <Button
            isIconOnly
            variant="secondary"
            className="size-12 rounded-full"
            onPress={() => onOpenChange(false)}
            accessibilityLabel={t('mainPage.close')}
          >
            <X size={22} color={foreground} />
          </Button>
        )}
      </View>

      <View className="gap-3">
        <Text className="text-lg font-bold">{t('mainPage.language')}</Text>
        <View className="flex-row flex-wrap gap-3">
          {languages.map((language) => {
            const active = language.code === current.code;
            return (
              <PressableFeedback
                key={language.code}
                isDisabled={changing}
                onPress={() => language.code !== current.code && change(language.code)}
                className={cn(
                  'h-16 w-[48.5%] flex-row items-center gap-3.5 rounded-2xl px-4',
                  active ? 'border-2 border-foreground bg-surface' : 'border border-border bg-surface',
                )}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Flag language={language.code} width={40} />
                <Text className={cn('text-lg', active ? 'font-bold' : 'font-medium')}>{language.label}</Text>
              </PressableFeedback>
            );
          })}
        </View>
      </View>

      {/* The whole row toggles; the switch only shows which it is. It takes no touches itself:
          left touchable, it swallowed the tap and nothing happened (as in the gift dialog) */}
      <PressableFeedback
        onPress={toggleTheme}
        className="h-16 flex-row items-center gap-3.5 rounded-2xl bg-background px-4.5"
        accessibilityRole="switch"
        accessibilityState={{ checked: isDark }}
      >
        <Moon size={22} color={foreground} />
        <Text className="flex-1 text-lg font-semibold" numberOfLines={1}>
          {t('setup.darkMode')}
        </Text>
        <View pointerEvents="none">
          <Switch isSelected={isDark} />
        </View>
      </PressableFeedback>
    </MotionDialog>
  );
};
