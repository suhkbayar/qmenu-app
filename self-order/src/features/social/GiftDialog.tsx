import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useQuery } from '@apollo/client';
import { Button, Dialog, PressableFeedback, Spinner, Switch, cn, useThemeColor } from 'heroui-native';
import { FlashList } from '@shopify/flash-list';
import { ArrowLeft, Check, EyeOff, Gift, MapPin, Minus, Plus, Send, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useCSSVariable } from 'uniwind';
import { MenuItemState, TABLE_MESSAGE_STICKERS } from '@/src/constants';
import { IGiftTarget, useCartStore } from '@/src/features/cart/cartStore';
import { lineTotal } from '@/src/features/cart/totals';
import { useHoldScreensaver } from '@/src/features/kiosk/screensaverHold';
import { ProductSheet } from '@/src/features/menu/ProductSheet';
import { useSessionStore } from '@/src/features/session/sessionStore';
import { GET_ACTIVE_TABLES } from '@/src/graphql/queries/tableMessage';
import { formatMoney } from '@/src/lib/format';
import { getCdnImageUrl } from '@/src/lib/image';
import { isConfigurable, isCurrentlyOpen } from '@/src/lib/menu';
import { IMenuCategory, IMenuProduct, IOrderItem } from '@/src/types';
import { ITable } from '@/src/types/table';
import { Appear } from '@/src/ui/Appear';
import { Image } from '@/src/ui/Image';
import { Text } from '@/src/ui/Text';
import { useOpened, whenClosed } from '@/src/ui/useOpened';
import { useSocialStore } from './socialStore';
import { Sticker } from './Sticker';
import { TableFloorPlan, useOwnTableId } from './TableFloorPlan';

type Step = 'table' | 'dish' | 'message';
const STEPS: Step[] = ['table', 'dish', 'message'];
const OPENERS = TABLE_MESSAGE_STICKERS.filter((s) => s.tone === 'OPENER');

// White on the gift red, as a fixed colour: theme text colours on fills were unreliable on the tablets
const ON_GIFT = '#FFFFFF';

/**
 * Gift: send a dish to another table, one question at a time (their table, a dish, a sticker). What's
 * picked so far sits in a bar at the bottom. The gift waits in the cart and goes out with the order.
 */
export const GiftDialog = () => {
  const isOpen = useSocialStore((s) => s.composer === 'gift');
  const close = useSocialStore((s) => s.closeComposer);
  const window = useWindowDimensions();
  useHoldScreensaver(isOpen);

  // Each open starts fresh; the last one stays on screen while the dialog animates closed
  const [session, setSession] = useState(0);
  useEffect(() => {
    if (isOpen) setSession((n) => n + 1);
  }, [isOpen]);

  return (
    <Dialog isOpen={isOpen} onOpenChange={(open) => !open && close()}>
      <Dialog.Portal>
        {/* No open/close animation: on the tablets it sometimes stalled, leaving the dialog or its
            dim backdrop stuck on screen */}
        <Dialog.Overlay animation={false} />
        {/* Not swipeable: dragging should scroll the dishes, not move the dialog. 1080×660, smaller on a smaller screen */}
        <Dialog.Content
          animation={false}
          isSwipeable={false}
          className="self-center overflow-hidden p-0"
          style={{ width: Math.min(1080, window.width - 48), height: Math.min(660, window.height - 40) }}
        >
          {session > 0 && <GiftFlow key={session} onClose={close} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
};

const GiftFlow = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation('language');
  const [foreground, accentForeground] = useThemeColor(['foreground', 'accent-foreground']);
  const giftText = useCSSVariable('--color-gift-text') as string;
  const [step, setStep] = useState<Step>('table');
  const [table, setTable] = useState<IGiftTarget | null>(null);
  const [product, setProduct] = useState<IMenuProduct | null>(null);
  const [configured, setConfigured] = useState<IOrderItem | null>(null);
  const [configuring, setConfiguring] = useState<IMenuProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [stickerId, setStickerId] = useState<string | null>(null);
  const [anonymous, setAnonymous] = useState(() => useCartStore.getState().giftAnonymous);

  // The tables from the last open at once, brought up to date from the server straight after
  const { data, loading } = useQuery(GET_ACTIVE_TABLES, { fetchPolicy: 'cache-and-network' });
  const tables: ITable[] = data?.getActiveTables ?? [];
  const ownTableId = useOwnTableId();
  // The plan (a button per table) is drawn once the dialog is open, so it doesn't slow the opening
  const opened = useOpened();
  // The product panel, for dishes with options, is only built once one is picked
  const sheetUsed = useRef(false);
  if (configuring) sheetUsed.current = true;
  const adding = useRef(false);

  const index = STEPS.indexOf(step);
  const ready = !!table && !!product;
  const unitPrice = configured ? lineTotal({ ...configured, quantity: 1 }) : (product?.variants?.[0]?.salePrice ?? 0);

  const pickTable = (picked: ITable) => {
    setTable({ id: picked.id, name: picked.name });
    setStep('dish');
  };

  // Dishes with a choice to make go through the product panel and come back as a ready line
  const pickProduct = (picked: IMenuProduct) => {
    if (isConfigurable(picked)) return setConfiguring(picked);
    setProduct(picked);
    setConfigured(null);
    setQuantity(1);
    setStep('message');
  };

  const applyConfigured = (item: IOrderItem) => {
    setProduct(configuring);
    setConfigured(item);
    setQuantity(item.quantity || 1);
    setConfiguring(null);
    setStep('message');
  };

  const addToOrder = () => {
    // A second tap while it closes doesn't add the gift twice
    if (!table || !product || adding.current) return;
    adding.current = true;
    // The dialog closes before the cart changes, so the order bar redraws after the animation
    onClose();
    whenClosed(() => {
      const cart = useCartStore.getState();
      cart.setGiftTarget(table);
      cart.setGiftSticker(stickerId);
      cart.setGiftAnonymous(anonymous);
      if (configured) cart.addGiftOrderItem({ ...configured, quantity }, table);
      else cart.addGiftItem(product, quantity, table);
    });
  };

  const [title, subtitle] = {
    table: [t('mainPage.gift_picker_title'), t('mainPage.gift_picker_subtitle')],
    dish: [t('mainPage.gift_choose_title'), t('mainPage.gift_choose_subtitle')],
    message: [t('mainPage.gift_message_title'), t('mainPage.gift_sticker_subtitle')],
  }[step];

  return (
    <>
      <View className="flex-1 gap-5 px-7 pb-5 pt-7">
        {/* The question, how far along, and close. From step 2 on, back replaces the gift mark. */}
        <View className="flex-row items-center gap-4">
          {index === 0 ? (
            <View className="size-13 items-center justify-center rounded-2xl bg-gift">
              <Gift size={26} color={ON_GIFT} strokeWidth={2.2} />
            </View>
          ) : (
            <Button
              isIconOnly
              variant="secondary"
              className="size-13 rounded-full"
              onPress={() => setStep(STEPS[index - 1])}
              accessibilityLabel={t('mainPage.GoBack')}
            >
              <ArrowLeft size={24} color={foreground} />
            </Button>
          )}
          <View className="min-w-0 flex-1 gap-0.5">
            <Dialog.Title className="text-[30px] font-bold tracking-tight" numberOfLines={1}>
              {title}
            </Dialog.Title>
            <Text className="text-muted" numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
          <View className="flex-row items-center gap-2.5" accessibilityLabel={`${index + 1}/3`}>
            <View className="flex-row gap-1.5">
              {STEPS.map((s, i) => (
                <View key={s} className={cn('h-1.5 w-7 rounded-full', i <= index ? 'bg-gift' : 'bg-border')} />
              ))}
            </View>
            <Text className="text-sm font-semibold text-muted">{index + 1}/3</Text>
          </View>
          <Button
            isIconOnly
            variant="secondary"
            className="size-12 rounded-full"
            onPress={onClose}
            accessibilityLabel={t('mainPage.close')}
          >
            <X size={22} color={foreground} />
          </Button>
        </View>

        {step === 'table' &&
          opened &&
          (loading && !tables.length ? (
            <Spinner className="mt-10 self-center" />
          ) : tables.some((tb) => tb.id !== ownTableId) ? (
            <Appear duration={150} style={{ flex: 1 }}>
              <GiftTables tables={tables} ownTableId={ownTableId} markedId={table?.id} onPick={pickTable} />
            </Appear>
          ) : (
            <Text className="mt-10 text-center text-lg text-muted">{t('mainPage.no_other_tables')}</Text>
          ))}
        {step === 'dish' && <DishStep selectedId={product?.productId} onPick={pickProduct} />}
        {step === 'message' && (
          <MessageStep
            stickerId={stickerId}
            onPick={setStickerId}
            anonymous={anonymous}
            onAnonymous={setAnonymous}
          />
        )}
      </View>

      {/* What's picked so far, like a cart. Tapping the table or dish goes back to change it. */}
      {!!table && (
        <View className="h-22 flex-row items-center gap-3 border-t border-border bg-background px-7">
          <PickedChip onPress={() => setStep('table')} accessibilityLabel={t('mainPage.toast_from_table', { table: table.name })}>
            <ChipMark>
              <MapPin size={18} color={giftText} strokeWidth={2.2} />
            </ChipMark>
            <Text className="text-lg font-bold" numberOfLines={1}>
              {t('mainPage.toast_from_table', { table: table.name })}
            </Text>
          </PickedChip>

          {!!product && (
            <View className="h-13 shrink flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-2">
              <PressableFeedback
                onPress={() => setStep('dish')}
                accessibilityRole="button"
                className="shrink flex-row items-center gap-3"
              >
                <Image
                  source={product.image ? { uri: getCdnImageUrl(product.image, 'sm') } : require('@/assets/images/noImage.jpg')}
                  className="size-9 rounded-[11px] bg-surface-tertiary"
                  contentFit="cover"
                />
                <Text className="max-w-56 shrink text-lg font-bold" numberOfLines={1}>
                  {configured?.name ?? product.name}
                </Text>
              </PressableFeedback>
              {/* How many: two round buttons in the chip, no track of their own */}
              <View className="h-9 flex-row items-center gap-2 border-l border-border pl-3">
                <RoundButton
                  label={t('mainPage.decrease')}
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                  className="bg-surface-secondary"
                >
                  <Minus size={16} color={foreground} strokeWidth={2.6} />
                </RoundButton>
                <Text className="min-w-6 text-center text-lg font-bold">{quantity}</Text>
                <RoundButton
                  label={t('mainPage.increase')}
                  onPress={() => setQuantity(Math.min(20, quantity + 1))}
                  className="bg-accent"
                >
                  <Plus size={16} color={accentForeground} strokeWidth={2.6} />
                </RoundButton>
              </View>
            </View>
          )}

          <View className="flex-1" />

          {ready ? (
            <View className="flex-row items-center gap-5">
              <View className="items-end">
                <Text className="text-sm text-muted">{t('mainPage.Total')}</Text>
                <Text className="text-2xl font-bold tracking-tight">{formatMoney(unitPrice * quantity)}</Text>
              </View>
              <Button size="lg" className="h-14 rounded-[18px] px-8" onPress={addToOrder}>
                <Button.Label numberOfLines={1} className="text-lg font-bold">
                  {t('mainPage.gift_add')}
                </Button.Label>
              </Button>
            </View>
          ) : (
            <Text className="text-muted">{t('mainPage.gift_pick_dish')}</Text>
          )}
        </View>
      )}

      {sheetUsed.current && (
        <ProductSheet product={configuring} onClose={() => setConfiguring(null)} onConfigured={applyConfigured} />
      )}
    </>
  );
};

/** A picked thing in the bottom bar, tappable to change it. */
const PickedChip = ({
  onPress,
  accessibilityLabel,
  children,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  children: ReactNode;
}) => (
  <PressableFeedback
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    className="h-13 flex-row items-center gap-2.5 rounded-2xl border border-border bg-surface pl-2 pr-4"
  >
    {children}
  </PressableFeedback>
);

const RoundButton = ({
  label,
  onPress,
  className,
  children,
}: {
  label: string;
  onPress: () => void;
  className: string;
  children: ReactNode;
}) => (
  <PressableFeedback
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
    className={cn('size-9 items-center justify-center rounded-full', className)}
  >
    {children}
  </PressableFeedback>
);

const ChipMark = ({ children }: { children: ReactNode }) => (
  <View className="size-9 items-center justify-center rounded-[11px] bg-gift-soft">{children}</View>
);

const GiftTables = ({
  tables,
  ownTableId,
  markedId,
  onPick,
}: {
  tables: ITable[];
  ownTableId: string | null;
  markedId?: string;
  onPick: (table: ITable) => void;
}) => {
  const color = useCSSVariable('--color-gift') as string;
  return <TableFloorPlan tables={tables} ownTableId={ownTableId} markedId={markedId} color={color} onSelect={onPick} />;
};

type DishGroup = { id: string; name: string; products: IMenuProduct[] };

/** Dishes orderable right now, grouped by category; each dish once. */
const useGiftableDishes = () => {
  const categories = useSessionStore((s) => s.participant?.menu?.categories);
  return useMemo(() => {
    const groups: DishGroup[] = [];
    const seen = new Set<string>();
    const walk = (cats: IMenuCategory[] = []) => {
      for (const cat of cats) {
        if (!isCurrentlyOpen(cat.timetable)) continue;
        const products = (cat.products ?? []).filter(
          (p) => p.state === MenuItemState.ACTIVE && !!p.variants?.length && !seen.has(p.productId),
        );
        products.forEach((p) => seen.add(p.productId));
        if (products.length) groups.push({ id: cat.id, name: cat.name, products });
        walk(cat.children);
      }
    };
    walk(categories);
    return groups;
  }, [categories]);
};

// Android's own touch ripple, as on the category rail
const CHIP_RIPPLE = { color: 'rgba(0,0,0,0.08)', foreground: true };

/** Category chips over a 5-column grid of that category's dishes. */
const DishStep = ({ selectedId, onPick }: { selectedId?: string; onPick: (product: IMenuProduct) => void }) => {
  const { t } = useTranslation('language');
  const [foreground, accent, accentForeground, surface, border] = useThemeColor([
    'foreground',
    'accent',
    'accent-foreground',
    'surface',
    'border',
  ]);
  const groups = useGiftableDishes();
  const [groupId, setGroupId] = useState(
    () => groups.find((g) => g.products.some((p) => p.productId === selectedId))?.id ?? groups[0]?.id,
  );
  const group = groups.find((g) => g.id === groupId) ?? groups[0];

  if (!group) return <Text className="mt-10 text-center text-lg text-muted">{t('mainPage.noResults')}</Text>;

  return (
    <View className="flex-1 gap-3.5">
      <ScrollView horizontal className="grow-0" contentContainerClassName="gap-2" showsHorizontalScrollIndicator={false}>
        {groups.map((g) => {
          const active = g.id === group.id;
          return (
            // A plain Pressable with every colour through style, like the category rail: with heroui's
            // PressableFeedback and a toggled fill class, a selected chip came out plain yellow
            <Pressable
              // Drawn anew when picked or not: a chip whose fill changed on screen lost its label
              key={`${g.id}-${active}`}
              onPress={() => setGroupId(g.id)}
              android_ripple={CHIP_RIPPLE}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              className="h-11 justify-center overflow-hidden rounded-full border px-4"
              style={{ backgroundColor: active ? accent : surface, borderColor: active ? accent : border }}
            >
              <Text
                className={active ? 'font-bold' : 'font-medium'}
                style={{ color: active ? accentForeground : foreground }}
                numberOfLines={1}
              >
                {g.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View className="-mx-1.5 flex-1">
        <FlashList
          key={group.id}
          data={group.products}
          numColumns={5}
          extraData={selectedId}
          keyExtractor={(p) => p.productId}
          renderItem={({ item }) => (
            <DishCard product={item} selected={item.productId === selectedId} onPress={() => onPick(item)} />
          )}
        />
      </View>
    </View>
  );
};

const DishCard = ({ product, selected, onPress }: { product: IMenuProduct; selected: boolean; onPress: () => void }) => (
  <PressableFeedback
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected }}
    className={cn(
      'm-1.5 overflow-hidden rounded-[18px] bg-surface',
      selected ? 'border-2 border-gift' : 'border border-surface-tertiary',
    )}
  >
    <Image
      source={product.image ? { uri: getCdnImageUrl(product.image, 'sm') } : require('@/assets/images/noImage.jpg')}
      className="h-28 w-full bg-surface-tertiary"
      contentFit="cover"
    />
    <View className="gap-1 px-3 pb-3 pt-2.5">
      <Text className="font-semibold" numberOfLines={1}>
        {product.name}
      </Text>
      <Text className="font-bold">{formatMoney(product.variants?.[0]?.salePrice ?? 0)}</Text>
    </View>
    {selected && <PickedBadge />}
  </PressableFeedback>
);

/** "Send without a message" and the opener stickers, three to a row, then whether to hide our table. */
const MessageStep = ({
  stickerId,
  onPick,
  anonymous,
  onAnonymous,
}: {
  stickerId: string | null;
  onPick: (id: string | null) => void;
  anonymous: boolean;
  onAnonymous: (anonymous: boolean) => void;
}) => {
  const { t } = useTranslation('language');
  const [muted, foreground] = useThemeColor(['muted', 'foreground']);

  return (
    <View className="gap-3.5">
      <View className="flex-row flex-wrap gap-3">
        <StickerTile selected={stickerId === null} label={t('mainPage.skip_gift_message')} onPress={() => onPick(null)}>
          <View className="size-14 items-center justify-center rounded-full bg-surface-secondary">
            <Send size={24} color={muted} />
          </View>
        </StickerTile>
        {OPENERS.map((s) => {
          const selected = s.id === stickerId;
          return (
            <StickerTile key={s.id} selected={selected} label={t(`mainPage.${s.labelKey}`)} onPress={() => onPick(s.id)}>
              {/* Remounts when picked, so it plays then */}
              <Sticker key={selected ? 'picked' : 'still'} id={s.id} size={54} plays={selected ? 2 : 0} />
            </StickerTile>
          );
        })}
      </View>
      {/* Sized to its content but big enough to notice; the whole card toggles, red while it's on */}
      <PressableFeedback
        onPress={() => onAnonymous(!anonymous)}
        accessibilityRole="switch"
        accessibilityState={{ checked: anonymous }}
        accessibilityLabel={t('mainPage.gift_anonymous')}
        className={cn(
          'h-16 flex-row items-center gap-3.5 self-start rounded-[20px] border-2 pl-3 pr-3.5',
          anonymous ? 'border-gift bg-gift-soft' : 'border-border bg-surface',
        )}
      >
        <View className={cn('size-10 items-center justify-center rounded-xl', anonymous ? 'bg-gift' : 'bg-surface-secondary')}>
          <EyeOff size={21} color={anonymous ? ON_GIFT : foreground} strokeWidth={2.2} />
        </View>
        <Text className="text-lg font-bold" numberOfLines={1}>
          {t('mainPage.gift_anonymous')}
        </Text>
        <View pointerEvents="none">
          <Switch isSelected={anonymous} />
        </View>
      </PressableFeedback>
    </View>
  );
};

const StickerTile = ({
  selected,
  label,
  onPress,
  children,
}: {
  selected: boolean;
  label: string;
  onPress: () => void;
  children: ReactNode;
}) => (
  <PressableFeedback
    onPress={onPress}
    accessibilityRole="radio"
    accessibilityState={{ checked: selected }}
    className={cn(
      'h-35 w-[31.8%] items-center justify-center gap-2.5 rounded-[20px] px-3',
      selected ? 'border-2 border-gift bg-gift-soft' : 'border border-border bg-surface',
    )}
  >
    {children}
    <Text className="self-stretch text-center font-bold leading-snug" numberOfLines={2}>
      {label}
    </Text>
    {selected && <PickedBadge />}
  </PressableFeedback>
);

const PickedBadge = () => (
  <View className="absolute right-3 top-3 size-7 items-center justify-center rounded-full bg-gift">
    <Check size={16} color={ON_GIFT} strokeWidth={3} />
  </View>
);
