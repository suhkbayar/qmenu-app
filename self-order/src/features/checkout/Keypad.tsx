import { Pressable, View } from 'react-native';
import { cn, useThemeColor } from 'heroui-native';
import { Delete } from 'lucide-react-native';
import { Text } from '@/src/ui/Text';

export const BACKSPACE = '{bksp}';
export const CLEAR = '{clear}';

// Android's own touch ripple on the plain key views
const RIPPLE = { color: 'rgba(0,0,0,0.08)', foreground: true };

/** One key applied to a field's value: a character (up to maxLength), backspace or clear. */
export const applyKey = (value: string, key: string, maxLength: number) => {
  if (key === BACKSPACE) return value.slice(0, -1);
  if (key === CLEAR) return '';
  return value.length < maxLength ? value + key : value;
};

const Key = ({ value, className, onPress }: { value: string; className?: string; onPress: () => void }) => {
  const foreground = useThemeColor('foreground');
  const special = value === BACKSPACE || value === CLEAR;
  return (
    <Pressable
      onPress={onPress}
      android_ripple={RIPPLE}
      accessibilityRole="button"
      accessibilityLabel={value === BACKSPACE ? '⌫' : value === CLEAR ? 'C' : value}
      className={cn(
        'h-11 items-center justify-center overflow-hidden rounded-xl border border-border',
        special ? 'bg-surface-secondary' : 'bg-surface',
        className,
      )}
    >
      {value === BACKSPACE ? (
        <Delete size={22} color={foreground} />
      ) : (
        // Full key width: Android cuts off a centred label sized to its own text
        <Text className="self-stretch text-center text-xl font-bold">{value === CLEAR ? 'C' : value}</Text>
      )}
    </Pressable>
  );
};

const NUMBER_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  [CLEAR, '0', BACKSPACE],
];

/** 1–9, C, 0, ⌫ on the screen, for card numbers, phones and PINs (no system keyboard over the dialog). */
export const NumberPad = ({ onKey }: { onKey: (key: string) => void }) => (
  <View className="gap-2">
    {NUMBER_ROWS.map((row) => (
      <View key={row.join('')} className="flex-row gap-2">
        {row.map((key) => (
          <Key key={key} value={key} className="flex-1" onPress={() => onKey(key)} />
        ))}
      </View>
    ))}
  </View>
);

const CODE_ROWS = ['1234567890', 'QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

/** Digits and capital letters, as printed on the coupons, with ⌫: for coupon codes. */
export const CodeKeyboard = ({ onKey }: { onKey: (key: string) => void }) => (
  <View className="items-center gap-2">
    {CODE_ROWS.map((row, index) => (
      <View key={row} className="flex-row gap-2">
        {row.split('').map((key) => (
          <Key key={key} value={key} className="h-12 w-15" onPress={() => onKey(key)} />
        ))}
        {index === CODE_ROWS.length - 1 && (
          <Key value={BACKSPACE} className="h-12 w-25" onPress={() => onKey(BACKSPACE)} />
        )}
      </View>
    ))}
  </View>
);
