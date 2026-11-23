import { ReactNode } from 'react';
import { View } from 'react-native';
import { Button, useThemeColor } from 'heroui-native';
import { ArrowLeft, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/src/ui/Text';

/** A checkout step's title, with a back arrow and/or a close button, and anything to show before close. */
export const StepHeader = ({
  title,
  onBack,
  onClose,
  extra,
}: {
  title: string;
  onBack?: () => void;
  onClose?: () => void;
  extra?: ReactNode;
}) => {
  const { t } = useTranslation('language');
  const foreground = useThemeColor('foreground');
  return (
    <View className="flex-row items-center gap-3.5">
      {onBack && (
        <Button
          isIconOnly
          variant="secondary"
          className="size-12 rounded-full"
          onPress={onBack}
          accessibilityLabel={t('mainPage.GoBack')}
        >
          <ArrowLeft size={22} color={foreground} />
        </Button>
      )}
      <Text className="flex-1 text-3xl font-bold tracking-tight" numberOfLines={1}>
        {title}
      </Text>
      {extra}
      {onClose && (
        <Button
          isIconOnly
          variant="secondary"
          className="size-12 rounded-full"
          onPress={onClose}
          accessibilityLabel={t('mainPage.close')}
        >
          <X size={22} color={foreground} />
        </Button>
      )}
    </View>
  );
};
