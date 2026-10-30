import { useCallback, useRef } from 'react';
import { Pressable, View } from 'react-native';
import { cn, useThemeColor, useToast } from 'heroui-native';
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react-native';
import { useCSSVariable } from 'uniwind';
import { Appear } from './Appear';
import { Text } from './Text';

export type NoticeVariant = 'success' | 'warning' | 'danger' | 'default';

const ICONS = { success: CircleCheck, warning: TriangleAlert, danger: CircleAlert, default: Info };
const FILLS = {
  success: 'bg-positive-soft',
  warning: 'bg-pending-soft',
  danger: 'bg-danger/15',
  default: 'bg-surface-secondary',
};

/**
 * Shows a short notice at the top of the screen: `notify('success', t('mainPage.orderSent'))`.
 * heroui's own toasts slide in with Reanimated layout animations, which put Android's views out
 * of step with React's on the tablets (the crash on Дахин шалгах), so theirs are turned off in the root
 * layout and this draws our own, faded in through a shared value. One shows at a time; a tap
 * hides it.
 */
export const useNotify = () => {
  const { toast } = useToast();
  const latest = useRef(toast);
  latest.current = toast;

  return useCallback((variant: NoticeVariant, label: string) => {
    latest.current.hide('all');
    latest.current.show({
      component: ({ id, hide }) => <Notice variant={variant} label={label} onPress={() => hide(id)} />,
    });
  }, []);
};

const Notice = ({ variant, label, onPress }: { variant: NoticeVariant; label: string; onPress: () => void }) => {
  const [foreground, danger] = useThemeColor(['foreground', 'danger']);
  const [positive, pending] = useCSSVariable(['--color-positive', '--color-pending']) as string[];
  const Icon = ICONS[variant];
  const color = { success: positive, warning: pending, danger, default: foreground }[variant];

  return (
    <View pointerEvents="box-none" className="absolute inset-x-0 top-0 items-center">
      <Appear from="top" duration={220}>
        {/* A set width, the label filling what's left: sized to its own text, Android cuts off its last word */}
        <Pressable
          onPress={onPress}
          className="w-140 flex-row items-center gap-3.5 rounded-full border border-border bg-overlay py-2.5 pl-2.5 pr-6 shadow-lg"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <View className={cn('size-12 items-center justify-center rounded-full', FILLS[variant])}>
            <Icon size={26} color={color} />
          </View>
          <Text className="flex-1 text-lg font-semibold" style={{ color: foreground }} numberOfLines={2}>
            {label}
          </Text>
        </Pressable>
      </Appear>
    </View>
  );
};
