import { memo, useEffect, useRef } from 'react';
import { ScrollView } from 'react-native';
import { PressableFeedback, cn } from 'heroui-native';
import { IMenuCategory } from '@/src/types';
import { Text } from '@/src/ui/Text';

type Props = {
  categories: IMenuCategory[];
  activeId?: string;
  onSelect: (id: string) => void;
};

/** Left column: the menu's top-level categories. The one the products have scrolled to is highlighted. */
export const CategoryRail = memo(({ categories, activeId, onSelect }: Props) => {
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
      {categories.map((category) => {
        const active = category.id === activeId;
        return (
          <PressableFeedback
            key={category.id}
            onLayout={(e) => (itemLayouts.current[category.id] = e.nativeEvent.layout)}
            onPress={() => onSelect(category.id)}
            className={cn('min-h-13.5 justify-center rounded-2xl px-4.5 py-2', active && 'bg-accent')}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text className={cn('text-lg leading-6', active ? 'font-bold text-accent-foreground' : 'font-medium')}>
              {category.name}
            </Text>
          </PressableFeedback>
        );
      })}
    </ScrollView>
  );
});
