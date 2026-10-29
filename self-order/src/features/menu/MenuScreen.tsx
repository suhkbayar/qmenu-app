import { useCallback, useMemo, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { OrderBar } from '@/src/features/cart/OrderBar';
import { OrderSheet } from '@/src/features/cart/OrderSheet';
import { useOrderSheet } from '@/src/features/cart/orderSheetStore';
import { CheckoutDialog } from '@/src/features/checkout/CheckoutDialog';
import { useOrderUpdates } from '@/src/features/orders/useTableOrders';
import { ServiceSheet } from '@/src/features/service/ServiceSheet';
import { SettingsDialog } from '@/src/features/session/SettingsDialog';
import { useSessionStore } from '@/src/features/session/sessionStore';
import { IParticipant } from '@/src/types';
import { CategoryRail } from './CategoryRail';
import { PinnedSubcategories } from './PinnedSubcategories';
import { ProductGrid, ProductGridHandle, gridColumns } from './ProductGrid';
import { MenuProductSheet } from './ProductSheet';
import { useProductSheet } from './productSheetStore';
import { TopBar } from './TopBar';
import { GridRow, useMenu } from './useMenu';

// The category rail's width (w-54), so the grid knows its own
const RAIL_WIDTH = 216;
// The order bar floats this far in from the grid's edges
const BAR_INSET = 24;

/**
 * The table's main screen. The top bar has the restaurant and table, Gift and Sit together (branches
 * that have them), language and Service; categories on the left; products filling the rest, with one
 * bar along the bottom for the order. The order sheet, product options, Service, language and
 * checkout open over it.
 */
export const MenuScreen = ({ participant }: { participant: IParticipant }) => {
  // Nothing squeezes the grid any more: the order sits over it, along the bottom or in the sheet
  const gridWidth = useWindowDimensions().width - RAIL_WIDTH;
  const columns = gridColumns(gridWidth);
  const menu = useMenu(participant.menu?.categories, columns);
  const hidePrice = useSessionStore((s) => s.config?.hidePrice === true);
  const openProduct = useProductSheet((s) => s.open);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const scroll = useCategoryScroll(menu.sectionStart, menu.subsectionStart, menu.categories[0]?.id);

  // The table's orders stay current as staff accept, close or take payment for them
  useOrderUpdates();
  const sheetOpen = useOrderSheet((s) => s.open);

  const openService = useCallback(() => setServiceOpen(true), []);
  const openSettings = useCallback(() => setSettingsOpen(true), []);

  const activeCategory = menu.categories.find((c) => c.id === scroll.activeId);
  const pinnedSubcategories = (activeCategory && menu.subcategoriesOf[activeCategory.id]) || [];
  // At a category's own title (above its first subcategory), the first subcategory is the current one
  const activeSubId = scroll.activeSubId ?? pinnedSubcategories[0]?.id ?? null;
  const selectPinned = useCallback(
    (subcategoryId: string) => scroll.activeId && scroll.selectSub(scroll.activeId, subcategoryId),
    [scroll.activeId, scroll.selectSub],
  );

  // Scrolling re-renders this screen whenever the highlighted category changes. The order bar and
  // the dialogs over the menu don't depend on that, so they're kept as the same elements and React
  // skips them, instead of redrawing all of them on every change while the guest scrolls.
  const orderBar = useMemo(() => <OrderBar hidden={sheetOpen} />, [sheetOpen]);
  const overlays = useMemo(
    () => (
      <>
        <OrderSheet onOpenProduct={openProduct} />
        <MenuProductSheet />
        <ServiceSheet isOpen={serviceOpen} onOpenChange={setServiceOpen} />
        <SettingsDialog isOpen={settingsOpen} onOpenChange={setSettingsOpen} />
        <CheckoutDialog />
      </>
    ),
    [serviceOpen, settingsOpen, openProduct],
  );

  return (
    <View className="flex-1 bg-background">
      <TopBar showQuiz={scroll.pastQuiz} onOpenService={openService} onOpenSettings={openSettings} />

      <View className="flex-1 flex-row">
        <CategoryRail categories={menu.categories} activeId={scroll.activeId} onSelect={scroll.select} />

        <View className="flex-1">
          <ProductGrid
            ref={scroll.gridRef}
            width={gridWidth}
            columns={columns}
            rows={menu.rows}
            orderable={participant.orderable}
            hidePrice={hidePrice}
            onOpenProduct={openProduct}
            onTopRowChange={scroll.onTopRowChange}
            onUserScroll={scroll.onUserScroll}
            onSelectSubcategory={scroll.selectSub}
          />
          {activeCategory && pinnedSubcategories.length > 0 && (
            <PinnedSubcategories
              visible={scroll.pastTitle}
              title={activeCategory.name}
              subcategories={pinnedSubcategories}
              activeId={activeSubId}
              onSelect={selectPinned}
            />
          )}

          {/* The order, along the bottom over the products: the cart, or what's been ordered */}
          {participant.orderable && (
            <View style={{ position: 'absolute', left: BAR_INSET, right: BAR_INSET, bottom: BAR_INSET - 2 }}>
              {orderBar}
            </View>
          )}
        </View>
      </View>

      {overlays}
    </View>
  );
};

type Position = { categoryId?: string; subcategoryId: string | null };

/**
 * Keeps the rail, the subcategory buttons and the grid in step: scrolling highlights the category
 * and subcategory at the top, and tapping one scrolls to it. After a tap the highlight stays put
 * until the guest drags the list, so it doesn't flicker through the ones in between, or slip back
 * near the end of the menu.
 */
const useCategoryScroll = (
  sectionStart: Record<string, number>,
  subsectionStart: Record<string, number>,
  firstId?: string,
) => {
  const gridRef = useRef<ProductGridHandle>(null);
  const [position, setPosition] = useState<Position>({ subcategoryId: null });
  const [pastTitle, setPastTitle] = useState(false);
  const [pastQuiz, setPastQuiz] = useState(false);
  const jumping = useRef(false);

  const jump = useCallback((index: number | undefined, next: Position) => {
    if (index === undefined) return;
    jumping.current = true;
    setPosition(next);
    gridRef.current?.scrollToRow(index);
  }, []);

  /** A category from the rail */
  const select = useCallback(
    (categoryId: string) => jump(sectionStart[categoryId], { categoryId, subcategoryId: null }),
    [jump, sectionStart],
  );

  /** A subcategory button */
  const selectSub = useCallback(
    (categoryId: string, subcategoryId: string) =>
      jump(subsectionStart[subcategoryId], { categoryId, subcategoryId }),
    [jump, subsectionStart],
  );

  const onTopRowChange = useCallback((row: GridRow) => {
    // Past the category's own title (and its subcategory buttons): pin them over the products
    setPastTitle(row.type === 'products' || row.type === 'subsection');
    // The quiz banner (the first row) out of view: the top bar shows the quiz instead
    setPastQuiz(row.type !== 'quiz');
    if (jumping.current) return;
    setPosition((current) =>
      current.categoryId === row.categoryId && current.subcategoryId === row.subcategoryId
        ? current
        : { categoryId: row.categoryId, subcategoryId: row.subcategoryId },
    );
  }, []);

  const onUserScroll = useCallback(() => {
    jumping.current = false;
  }, []);

  // A category that's no longer on the menu (e.g. its hours ended) falls back to the first
  const known = !!position.categoryId && sectionStart[position.categoryId] !== undefined;

  return {
    gridRef,
    activeId: known ? position.categoryId : firstId,
    activeSubId: known ? position.subcategoryId : null,
    /** The top of the products is past the current category's title */
    pastTitle,
    /** The quiz banner at the top is scrolled out of view */
    pastQuiz,
    select,
    selectSub,
    onTopRowChange,
    onUserScroll,
  };
};
