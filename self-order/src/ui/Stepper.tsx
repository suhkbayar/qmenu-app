import { View } from 'react-native';
import { PressableFeedback, cn, useThemeColor } from 'heroui-native';
import { Minus, Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Text } from './Text';

type Props = {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  /** sm: 34dp buttons (order panel), md: 40dp (cards), lg: 50dp (product dialog) */
  size?: 'sm' | 'md' | 'lg';
};

const BUTTON = { sm: 'size-8.5', md: 'size-10', lg: 'size-12.5' };
const ICON = { sm: 16, md: 18, lg: 20 };

/** − quantity + on a grey pill; the plus is the brand yellow. */
export const Stepper = ({ quantity, onIncrease, onDecrease, size = 'md' }: Props) => {
  const { t } = useTranslation('language');
  const [foreground, accentForeground] = useThemeColor(['foreground', 'accent-foreground']);

  return (
    <View className="flex-row items-center gap-1 self-start rounded-full bg-surface-secondary p-1">
      <PressableFeedback
        onPress={onDecrease}
        accessibilityRole="button"
        accessibilityLabel={t('mainPage.decrease')}
        className={cn('items-center justify-center rounded-full bg-surface', BUTTON[size])}
      >
        <Minus size={ICON[size]} color={foreground} strokeWidth={2.4} />
      </PressableFeedback>
      <Text className={cn('min-w-6 text-center font-bold', size === 'lg' ? 'text-xl' : 'text-lg')}>{quantity}</Text>
      <PressableFeedback
        onPress={onIncrease}
        accessibilityRole="button"
        accessibilityLabel={t('mainPage.increase')}
        className={cn('items-center justify-center rounded-full bg-accent', BUTTON[size])}
      >
        <Plus size={ICON[size]} color={accentForeground} strokeWidth={2.4} />
      </PressableFeedback>
    </View>
  );
};
