import { memo, useEffect, useRef } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { useThemeColor } from 'heroui-native';
import { IMenuCategory } from '@/src/types';

// Android's own touch ripple, drawn natively over the tab
const RIPPLE = { color: 'rgba(0,0,0,0.08)', foreground: true };

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
  // Another category's tabs (the pinned bar stays put as the guest scrolls into the next category)
  // start from the left. Before the highlight below, so it can still bring the current one into view.
  const shown = useRef(subcategories);
  useEffect(() => {
    if (shown.current === subcategories) return;
    shown.current = subcategories;
    barRef.current?.scrollTo({ x: 0, animated: false });
  }, [subcategories]);
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
          <Pressable
            key={sub.id}
            onLayout={(e) => (chipLayouts.current[sub.id] = e.nativeEvent.layout)}
            onPress={() => onSelect(sub.id)}
            android_ripple={RIPPLE}
            // Tall enough to tap; the underline sits along the bottom
            className="h-11 justify-center border-b-[3px]"
            style={{ borderBottomColor: active ? accent : 'transparent' }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text
              className={active ? 'font-bold text-[17px]' : 'font-medium text-[17px]'}
              style={{ color: active ? foreground : muted }}
              numberOfLines={1}
            >
              {sub.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
});
