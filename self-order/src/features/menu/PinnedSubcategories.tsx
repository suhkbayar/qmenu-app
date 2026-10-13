import { memo } from 'react';
import { View } from 'react-native';
import { IMenuCategory } from '@/src/types';
import { Text } from '@/src/ui/Text';
import { SubcategoryChips } from './SubcategoryChips';

type Props = {
  /** Shown once the category's own title has scrolled away; hidden otherwise */
  visible: boolean;
  title: string;
  subcategories: IMenuCategory[];
  activeId: string | null;
  onSelect: (subcategoryId: string) => void;
};

/**
 * Pinned over the top of the products once a category's own title has scrolled away, so the guest
 * always sees which subcategory they're in and can jump to another. Kept in place and only shown or
 * hidden, with no fade, so scrolling past a title doesn't set anything up mid-scroll.
 */
export const PinnedSubcategories = memo(({ visible, title, subcategories, activeId, onSelect }: Props) => (
  <View
    pointerEvents={visible ? 'auto' : 'none'}
    style={{ position: 'absolute', top: 0, left: 0, right: 0, opacity: visible ? 1 : 0 }}
  >
    <View className="flex-row items-center gap-4 border-b border-border bg-background py-2.5 pl-6">
      <Text className="max-w-60 text-xl font-bold" numberOfLines={1}>
        {title}
      </Text>
      <View className="flex-1">
        <SubcategoryChips subcategories={subcategories} activeId={activeId} onSelect={onSelect} />
      </View>
    </View>
  </View>
));
