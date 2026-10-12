import { memo, useEffect, useRef } from 'react';
import { ScrollView } from 'react-native';
import { PressableFeedback, cn, useThemeColor } from 'heroui-native';
import { IMenuCategory } from '@/src/types';
import { Text } from '@/src/ui/Text';

type Props = {
  /** The current category's subcategories */
  subcategories: IMenuCategory[];
  /** The highlighted subcategory; null highlights none (another category's buttons) */
  activeId: string | null;
  onSelect: (subcategoryId: string) => void;
};

/**
 * A category's subcategories as plain tabs, under its title in the product list, scrolling sideways;
 * the current one is bold and underlined in yellow. The highlight follows the products' scroll, and
 * a tab scrolls the products to its subcategory.
 */
export const SubcategoryChips = memo(({ subcategories, activeId, onSelect }: Props) => {
  // Colours set directly: theme text-colour classes on a changing selection came out wrong on the tablets
  const [foreground, muted, accent] = useThemeColor(['foreground', 'muted', 'accent']);
  // Keep the highlighted button in view when the scroll moves it off the side
  const barRef = useRef<ScrollView>(null);
  const chipLayouts = useRef<Record<string, { x: number; width: number }>>({});
  const viewport = useRef({ x: 0, width: 0 });
  useEffect(() => {
    if (!activeId) return;
    const chip = chipLayouts.current[activeId];
    if (!chip) return;
    const { x, width } = viewport.current;
    if (chip.x >= x && chip.x + chip.width <= x + width) return;
    barRef.current?.scrollTo({ x: Math.max(0, chip.x - (width - chip.width) / 2), animated: true });
  }, [activeId]);

  return (
    <ScrollView
      ref={barRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      className="grow-0"
      contentContainerClassName="items-center gap-6 pr-6"
      onLayout={(e) => (viewport.current.width = e.nativeEvent.layout.width)}
      onScroll={(e) => (viewport.current.x = e.nativeEvent.contentOffset.x)}
      scrollEventThrottle={100}
    >
      {subcategories.map((sub) => {
        const active = sub.id === activeId;
        return (
          <PressableFeedback
            key={sub.id}
            onLayout={(e) => (chipLayouts.current[sub.id] = e.nativeEvent.layout)}
            onPress={() => onSelect(sub.id)}
            // Tall enough to tap; the underline sits along the bottom
            className="h-11 justify-center border-b-[3px]"
            style={{ borderBottomColor: active ? accent : 'transparent' }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text
              className={cn('text-[17px]', active ? 'font-bold' : 'font-medium')}
              style={{ color: active ? foreground : muted }}
              numberOfLines={1}
            >
              {sub.name}
            </Text>
          </PressableFeedback>
        );
      })}
    </ScrollView>
  );
});
