import { memo, useCallback, useEffect, useRef } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, Text } from 'react-native';
import { cn, useThemeColor } from 'heroui-native';
import { IMenuCategory } from '@/src/types';

type Props = {
  categories: IMenuCategory[];
  activeId?: string;
  onSelect: (id: string) => void;
};

// Android's own touch ripple, drawn natively over the item
const RIPPLE = { color: 'rgba(0,0,0,0.08)', foreground: true };

/** Left column: the menu's top-level categories. The one the products have scrolled to is highlighted. */
export const CategoryRail = memo(({ categories, activeId, onSelect }: Props) => {
  // Colours set directly: theme text-colour classes on a changing selection came out wrong on the tablets
  const [foreground, accentForeground] = useThemeColor(['foreground', 'accent-foreground']);
  // Keep the highlighted category in view as the products scroll, but only move the rail when it's off-screen
  const railRef = useRef<ScrollView>(null);
  const itemLayouts = useRef<Record<string, { y: number; height: number }>>({});
  const viewport = useRef({ y: 0, height: 0 });
  useEffect(() => {
    const item = activeId ? itemLayouts.current[activeId] : undefined;
    if (!item) return;
    const { y, height } = viewport.current;
    if (item.y >= y && item.y + item.height <= y + height) return;
    railRef.current?.scrollTo({ y: Math.max(0, item.y - (height - item.height) / 2), animated: true });
  }, [activeId]);

  const onItemLayout = useCallback((id: string, e: LayoutChangeEvent) => (itemLayouts.current[id] = e.nativeEvent.layout), []);

  return (
    <ScrollView
      ref={railRef}
      className="w-54 grow-0 border-r border-border bg-surface"
      contentContainerClassName="gap-1 px-3 py-5"
      showsVerticalScrollIndicator={false}
      onLayout={(e) => (viewport.current.height = e.nativeEvent.layout.height)}
      onScroll={(e) => (viewport.current.y = e.nativeEvent.contentOffset.y)}
      scrollEventThrottle={100}
    >
      {categories.map((category) => (
        <RailItem
          // Drawn anew when it becomes or stops being the current one: a fill that changed on
          // screen could cover the label on the tablets
          key={`${category.id}-${category.id === activeId}`}
          id={category.id}
          name={category.name}
          active={category.id === activeId}
          color={category.id === activeId ? accentForeground : foreground}
          onSelect={onSelect}
          onItemLayout={onItemLayout}
        />
      ))}
    </ScrollView>
  );
});

/**
 * One category. Scrolling into the next category changes only two of these (the old highlight and
 * the new), so the rest are skipped instead of the whole rail redrawing mid-scroll.
 */
const RailItem = memo(
  ({
    id,
    name,
    active,
    color,
    onSelect,
    onItemLayout,
  }: {
    id: string;
    name: string;
    active: boolean;
    color: string;
    onSelect: (id: string) => void;
    onItemLayout: (id: string, e: LayoutChangeEvent) => void;
  }) => (
    <Pressable
      onLayout={(e) => onItemLayout(id, e)}
      onPress={() => onSelect(id)}
      android_ripple={RIPPLE}
      className={cn('min-h-13.5 justify-center overflow-hidden rounded-2xl px-4.5 py-2', active && 'bg-accent')}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text className={active ? 'font-bold text-lg leading-6' : 'font-medium text-lg leading-6'} style={{ color }}>
        {name}
      </Text>
    </Pressable>
  ),
);
