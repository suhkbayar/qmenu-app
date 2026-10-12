import { MenuItemState } from '@/src/constants';
import { IMenuCategory, IMenuProduct, IOrderItem } from '@/src/types';
import { ITimeTable } from '@/src/types/time-table';

/** Can't be ordered right now: switched off by the restaurant (DISABLED), or run out (SOLD_OUT). */
export const isUnavailable = (product: IMenuProduct): boolean =>
  product.state === MenuItemState.DISABLED || product.state === MenuItemState.SOLD_OUT;

/** Run out for now: the one that says Дууссан. */
export const isSoldOut = (product: IMenuProduct): boolean => product.state === MenuItemState.SOLD_OUT;

/** Whether adding the product needs a choice first (several variants, or options). */
export const isConfigurable = (product: IMenuProduct): boolean => {
  if (!product.variants) return false;
  if (product.variants.length > 1) return true;
  for (const item of product.variants) {
    if (item.options?.length > 0) return true;
  }
  return false;
};

type Day = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';
const DAYS: Day[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** "09:30" → minutes since midnight */
const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes || 0);
};

/** A day's opening hours in minutes, or null when it is closed that day. */
const hoursOf = (timetable: ITimeTable, day: Day) => {
  const open = timetable[`${day}Open`];
  const close = timetable[`${day}Close`];
  if (!timetable[day] || !open || !close) return null;
  return { open: toMinutes(open), close: toMinutes(close) };
};

/**
 * Whether a category's timetable has it open right now. No timetable means always open.
 * Hours can run past midnight (e.g. 18:00–02:00): at 01:00 the previous day's hours still apply.
 */
export const isCurrentlyOpen = (timetable?: ITimeTable | null, now = new Date()): boolean => {
  if (!timetable) return true;
  const minutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

  const today = hoursOf(timetable, DAYS[now.getDay()]);
  if (today) {
    const overnight = today.close < today.open;
    if (minutes > today.open && (overnight || minutes < today.close)) return true;
  }

  const yesterday = hoursOf(timetable, DAYS[(now.getDay() + 6) % 7]);
  return !!yesterday && yesterday.close < yesterday.open && minutes < yesterday.close;
};

/** Every product on the menu by its productId, subcategories included. */
export const indexProducts = (categories: IMenuCategory[] = []) => {
  const products = new Map<string, IMenuProduct>();
  const walk = (category: IMenuCategory) => {
    for (const product of category.products ?? []) products.set(product.productId, product);
    for (const child of category.children ?? []) walk(child);
  };
  categories.forEach(walk);
  return products;
};

// A dessert category, known by its name (restaurants call it one of these)
const DESSERT_CATEGORY = /амттан|десерт|dessert|бялуу|зайрмаг/i;

/** The menu's desserts that can be ordered now (its dessert category and subcategories), or none. */
export const findDesserts = (categories: IMenuCategory[] = []): IMenuProduct[] => {
  const all = (category: IMenuCategory): IMenuProduct[] => [
    ...(category.products ?? []),
    ...(category.children ?? []).flatMap(all),
  ];
  const find = (list: IMenuCategory[]): IMenuCategory | undefined => {
    for (const category of list) {
      if (DESSERT_CATEGORY.test(category.name ?? '')) return category;
      const child = find(category.children ?? []);
      if (child) return child;
    }
    return undefined;
  };
  const dessert = find(categories);
  return dessert ? all(dessert).filter((product) => !isUnavailable(product)) : [];
};

/** Cart items whose category is closed right now (outside its hours), so they can't be ordered. */
export const findClosedItems = (items: IOrderItem[], categories: IMenuCategory[] = []): IOrderItem[] => {
  const known = new Set<string>();
  const open = new Set<string>();
  const walk = (category: IMenuCategory, parentOpen: boolean) => {
    const isOpen = parentOpen && isCurrentlyOpen(category.timetable);
    for (const product of category.products ?? []) {
      known.add(product.productId);
      if (isOpen) open.add(product.productId);
    }
    for (const child of category.children ?? []) walk(child, isOpen);
  };
  categories.forEach((category) => walk(category, true));

  return items.filter((item) => !!item.productId && known.has(item.productId) && !open.has(item.productId));
};
