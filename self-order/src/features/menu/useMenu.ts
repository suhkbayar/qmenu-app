import { useEffect, useMemo, useState } from 'react';
import { MenuItemState } from '@/src/constants';
import { IMenuCategory, IMenuProduct } from '@/src/types';
import { isCurrentlyOpen } from '@/src/lib/menu';

/**
 * One row of the product list: a full-width banner, a category title (with its subcategory buttons),
 * a subcategory title, or a row of product cards (as many as fit across). categoryId (top-level) and
 * subcategoryId (null = none, or the category's own title) let the rail and the subcategory buttons
 * follow the scroll.
 */
export type GridRow =
  | { type: 'quiz'; key: string; categoryId: string; subcategoryId: null }
  | {
      type: 'section';
      key: string;
      title: string;
      subcategories: IMenuCategory[];
      categoryId: string;
      subcategoryId: null;
    }
  | { type: 'subsection'; key: string; title: string; categoryId: string; subcategoryId: string }
  | { type: 'products'; key: string; products: IMenuProduct[]; categoryId: string; subcategoryId: string | null };

const MINUTE_MS = 60 * 1000;

const visibleProducts = (category: IMenuCategory) =>
  (category.products ?? []).filter((p: IMenuProduct) => p.state !== MenuItemState.INACTIVE);

// A parent with subcategories shows its subcategories' products, otherwise its own
const productCategories = (category: IMenuCategory): IMenuCategory[] =>
  category.children?.length ? category.children : [category];

const openIds = (categories: IMenuCategory[]) =>
  categories
    .flatMap((c) => [c, ...(c.children ?? [])])
    .filter((c) => isCurrentlyOpen(c.timetable))
    .map((c) => c.id)
    .join(',');

/** Categories whose timetable is open right now. Re-checked every minute, but only re-renders when the set changes. */
const useOpenCategories = (categories: IMenuCategory[]) => {
  const [key, setKey] = useState(() => openIds(categories));

  useEffect(() => {
    setKey(openIds(categories));
    const id = setInterval(() => setKey(openIds(categories)), MINUTE_MS);
    return () => clearInterval(id);
  }, [categories]);

  return useMemo(() => {
    const open = new Set(key.split(','));
    return categories
      .filter((c) => open.has(c.id))
      .map((c) => ({ ...c, children: (c.children ?? []).filter((child) => open.has(child.id)) }));
  }, [categories, key]);
};

/**
 * The open menu as one continuous list: each category's title (with its subcategory buttons), its
 * subcategories' titles and products, `columns` cards to a row, with the Mbank quiz banner first.
 */
export const useMenu = (allCategories: IMenuCategory[] = [], columns = 4) => {
  const openCategories = useOpenCategories(allCategories);

  const menu = useMemo(() => {
    const rows: GridRow[] = [];
    // Row index where each category's / subcategory's title is, for jumping to it
    const sectionStart: Record<string, number> = {};
    const subsectionStart: Record<string, number> = {};
    // Only categories with something to show go in the rail
    const categories: IMenuCategory[] = [];
    // Each category's subcategory buttons (none when it has fewer than two subcategories to show)
    const subcategoriesOf: Record<string, IMenuCategory[]> = {};

    for (const category of openCategories) {
      const groups = productCategories(category)
        .map((sub) => ({ sub, products: visibleProducts(sub) }))
        .filter((group) => group.products.length > 0);
      if (!groups.length) continue;
      const split = groups.length > 1;

      // The banner sits above the first category and counts as part of it
      if (!rows.length) {
        rows.push({ type: 'quiz', key: 'quiz', categoryId: category.id, subcategoryId: null });
      }
      categories.push(category);
      subcategoriesOf[category.id] = split ? groups.map((group) => group.sub) : [];
      sectionStart[category.id] = rows.length;
      rows.push({
        type: 'section',
        key: `s-${category.id}`,
        title: category.name,
        subcategories: subcategoriesOf[category.id],
        categoryId: category.id,
        subcategoryId: null,
      });
      for (const { sub, products } of groups) {
        if (split) {
          subsectionStart[sub.id] = rows.length;
          rows.push({ type: 'subsection', key: `ss-${sub.id}`, title: sub.name, categoryId: category.id, subcategoryId: sub.id });
        }
        for (let i = 0; i < products.length; i += columns) {
          rows.push({
            type: 'products',
            key: `${sub.id}-${i}`,
            products: products.slice(i, i + columns),
            categoryId: category.id,
            subcategoryId: split ? sub.id : null,
          });
        }
      }
    }
    return { rows, sectionStart, subsectionStart, categories, subcategoriesOf };
  }, [openCategories, columns]);

  return menu;
};
