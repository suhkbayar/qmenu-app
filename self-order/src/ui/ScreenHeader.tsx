import { ReactNode } from 'react';
import { View } from 'react-native';
import { Button, useThemeColor } from 'heroui-native';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Text } from './Text';

type Props = {
  title: string;
  /** Defaults to going back one screen */
  onBack?: () => void;
  /** Shown on the right, e.g. a refresh button */
  right?: ReactNode;
};

/** Back button and title for screens outside the menu (payment, VAT, history). */
export const ScreenHeader = ({ title, onBack = () => router.back(), right }: Props) => {
  const { t } = useTranslation('language');
  const foreground = useThemeColor('foreground');

  return (
    <View className="flex-row items-center gap-4 border-b border-border bg-surface px-6 py-4">
      <Button variant="secondary" className="h-13 rounded-2xl px-4" onPress={onBack}>
        <ArrowLeft size={22} color={foreground} />
        <Button.Label numberOfLines={1} className="font-semibold">{t('mainPage.GoBack')}</Button.Label>
      </Button>
      <Text className="flex-1 text-2xl font-bold">{title}</Text>
      {right}
    </View>
  );
};
