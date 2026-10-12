import { ReactNode } from 'react';
import { View } from 'react-native';
import { PressableFeedback, cn } from 'heroui-native';
import type { LucideIcon } from 'lucide-react-native';
import { Text } from './Text';

type Props = {
  icon?: ReactNode;
  /** Instead of `icon`: a white icon on a coloured square (Gift, Sit together) */
  tile?: { Icon: LucideIcon; color: string };
  label: string;
  onPress: () => void;
  /** default: white; primary: the brand yellow */
  tone?: 'default' | 'primary';
  /** A small count beside the label, e.g. open orders */
  badge?: number;
  /** Icon only (narrow tablets); the label is still read out */
  iconOnly?: boolean;
};

const TONES = {
  default: 'border border-border bg-surface',
  primary: 'bg-accent',
};

/** A top bar button: icon and label, 52dp tall. */
export const ActionButton = ({ icon, tile, label, onPress, tone = 'default', badge, iconOnly }: Props) => (
  <PressableFeedback
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
    className={cn(
      'h-13 flex-row items-center justify-center gap-2.5 rounded-2xl',
      TONES[tone],
      iconOnly ? 'min-w-13 px-2' : tile ? 'pl-2 pr-4' : 'px-4',
    )}
  >
    {tile ? (
      <View className="size-9 items-center justify-center rounded-[11px]" style={{ backgroundColor: tile.color }}>
        <tile.Icon size={19} color="#FFFFFF" strokeWidth={2.3} />
      </View>
    ) : (
      icon
    )}
    {!iconOnly && (
      <Text
        className={cn(tone === 'primary' ? 'font-bold text-accent-foreground' : 'font-semibold')}
        numberOfLines={1}
      >
        {label}
      </Text>
    )}
    {!!badge && (
      <View className="h-6 min-w-6 items-center justify-center rounded-full bg-accent px-1.5">
        <Text className="text-xs font-bold text-accent-foreground">{badge}</Text>
      </View>
    )}
  </PressableFeedback>
);
