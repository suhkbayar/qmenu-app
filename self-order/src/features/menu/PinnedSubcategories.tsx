import { memo } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { IMenuCategory } from '@/src/types';
import { Text } from '@/src/ui/Text';
import { SubcategoryChips } from './SubcategoryChips';

type Props = {
  title: string;
  subcategories: IMenuCategory[];
  activeId: string | null;
  onSelect: (subcategoryId: string) => void;
};

/**
 * Pinned over the top of the products once a category's own title has scrolled away, so the guest
 * always sees which subcategory they're in and can jump to another.
 */
export const PinnedSubcategories = memo(({ title, subcategories, activeId, onSelect }: Props) => (
  <Animated.View
    entering={FadeIn.duration(150)}
    exiting={FadeOut.duration(150)}
    style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
  >
    <View className="flex-row items-center gap-4 border-b border-border bg-background py-2.5 pl-6">
      <Text className="max-w-60 text-xl font-bold" numberOfLines={1}>
        {title}
      </Text>
      <View className="flex-1">
        <SubcategoryChips subcategories={subcategories} activeId={activeId} onSelect={onSelect} />
      </View>
    </View>
  </Animated.View>
));
