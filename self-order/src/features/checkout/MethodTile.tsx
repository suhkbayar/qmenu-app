import { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { cn, useThemeColor } from 'heroui-native';
import { CreditCard, QrCode } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Image } from '@/src/ui/Image';
import { Spinner } from '@/src/ui/Spinner';
import { Text } from '@/src/ui/Text';
import { PaymentMethod } from './usePayment';

// М Банк's brand green, behind its wordmark
const MBANK_GREEN = '#21CDA8';
// Android's own touch ripple: the tiles are plain views, so the dialog has less to set up as it opens
const RIPPLE = { color: 'rgba(0,0,0,0.08)', foreground: true };

export type MethodLook = {
  name: string;
  mark: ReactNode;
  /** The mark's background when it's a brand colour; otherwise the neutral surface */
  markColor?: string;
};

/** How each payment method is shown: its name and its mark (brand logo or an icon). */
export const useMethodLook = (method: PaymentMethod): MethodLook => {
  const { t } = useTranslation('language');
  const foreground = useThemeColor('foreground');
  const icon = (Icon: typeof QrCode) => <Icon size={36} color={foreground} />;
  switch (method) {
    case 'MPY':
      return {
        name: 'М банк',
        // The "M pay" wordmark in white with a see-through box, so the green shows inside it. (Tinting
        // the black original turned its white box solid and hid the M.)
        mark: <Image source={require('@/assets/icon/mpay-white.png')} className="h-7 w-15" contentFit="contain" />,
        markColor: MBANK_GREEN,
      };
    case 'Toki':
      return {
        name: 'Toki',
        // Already a yellow square: it fills the whole mark
        mark: <Image source={require('@/assets/icon/new_toki.png')} className="size-full" contentFit="cover" />,
      };
    case 'MST':
      return { name: 'QR Pay', mark: icon(QrCode) };
    case 'QPay':
      return { name: 'QPay', mark: icon(QrCode) };
    case 'MCS':
      return { name: t('mainPage.card'), mark: icon(CreditCard) };
  }
};

export const MethodTile = ({
  method,
  loading,
  selected,
  compact,
  disabled,
  onPress,
}: {
  method: PaymentMethod;
  loading?: boolean;
  selected?: boolean;
  compact?: boolean;
  disabled: boolean;
  onPress: () => void;
}) => {
  const look = useMethodLook(method);
  return (
    <Tile {...look} loading={loading} selected={selected} compact={compact} disabled={disabled} onPress={onPress} />
  );
};

/**
 * A payment method or reward: its mark on top and its name under it. Compact in the narrow payment
 * column beside the U-Point discounts.
 */
export const Tile = ({
  name,
  mark,
  markColor,
  loading,
  selected,
  compact,
  disabled,
  onPress,
}: MethodLook & {
  loading?: boolean;
  selected?: boolean;
  compact?: boolean;
  disabled: boolean;
  onPress: () => void;
}) => {
  const accent = useThemeColor('accent');
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      android_ripple={RIPPLE}
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityState={{ disabled, selected }}
      // Mark on top and the name under it, so the logo can be big and the text still has the full width
      className={cn(
        'w-[31.8%] items-center justify-center overflow-hidden rounded-3xl border border-border bg-surface px-3',
        compact ? 'h-26 gap-2' : 'h-36 gap-3',
        disabled && !loading && !selected && 'opacity-50',
      )}
      // A chosen tile's border through style, as a toggled colour class can go missing on the tablets
      style={selected ? { borderColor: accent, borderWidth: 2 } : undefined}
    >
      <View
        className={cn(
          'items-center justify-center overflow-hidden bg-surface-secondary',
          compact ? 'size-13 rounded-2xl' : 'size-17 rounded-[20px]',
        )}
        style={markColor ? { backgroundColor: markColor } : undefined}
      >
        {loading ? <Spinner /> : mark}
      </View>
      {/* Full card width: Android cuts off a centred label sized to its own text */}
      <Text className={cn('self-stretch text-center font-bold', compact ? 'text-base' : 'text-lg')} numberOfLines={1}>
        {name}
      </Text>
    </Pressable>
  );
};
