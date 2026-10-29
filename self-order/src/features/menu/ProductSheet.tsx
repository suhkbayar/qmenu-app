import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { Button, Dialog, cn, useThemeColor } from 'heroui-native';
import * as Haptics from 'expo-haptics';
import { Check, MessageSquareText, Pencil, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import RenderHtml from 'react-native-render-html';
import { useCSSVariable } from 'uniwind';
import { useCartStore } from '@/src/features/cart/cartStore';
import { NoteDialog } from '@/src/features/cart/NoteDialog';
import { useHoldScreensaver } from '@/src/features/kiosk/screensaverHold';
import { useSessionStore } from '@/src/features/session/sessionStore';
import { formatMoney } from '@/src/lib/format';
import { isSoldOut, isUnavailable } from '@/src/lib/menu';
import { IMenuOption, IMenuProduct, IOrderItem } from '@/src/types';
import { generateUUID } from '@/src/lib/uuid';
import { getCdnImageUrl } from '@/src/lib/image';
import { Image } from '@/src/ui/Image';
import { Stepper } from '@/src/ui/Stepper';
import { Text } from '@/src/ui/Text';
import { useOpened, whenClosed } from '@/src/ui/useOpened';
import { Pairings } from './Pairings';
import { useProductSheet } from './productSheetStore';

// Android's own touch ripple, drawn natively over the button
const RIPPLE = { color: 'rgba(0,0,0,0.08)', foreground: true };

type Props = {
  /** The product to show; null closes the panel */
  product: IMenuProduct | null;
  onClose: () => void;
  /** Hand the configured line back instead of adding it to the cart (used when gifting) */
  onConfigured?: (item: IOrderItem) => void;
};

/** Product details over the menu: choose variant and options, set quantity, add to the cart. */
export const ProductSheet = ({ product, onClose, onConfigured }: Props) => {
  const window = useWindowDimensions();
  // Keep showing the last product while the panel animates closed; a new open starts fresh
  const [shown, setShown] = useState<{ product: IMenuProduct; session: number } | null>(null);
  useEffect(() => {
    if (product) setShown((s) => ({ product, session: (s?.session ?? 0) + 1 }));
  }, [product]);

  return (
    <Dialog isOpen={!!product} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay />
        {/* Not swipeable: dragging should scroll the options, not move the dialog */}
        {/* 980×640, smaller on a smaller screen */}
        <Dialog.Content
          isSwipeable={false}
          className="flex-row self-center overflow-hidden p-0"
          style={{ width: Math.min(980, window.width - 48), height: Math.min(640, window.height - 40) }}
        >
          {shown && (
            <ProductDetails key={shown.session} product={shown.product} onDone={onClose} onConfigured={onConfigured} />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
};

/** The menu's product sheet, showing the dish in useProductSheet. */
export const MenuProductSheet = () => {
  const product = useProductSheet((s) => s.product);
  const close = useProductSheet((s) => s.close);
  useHoldScreensaver(!!product);
  return <ProductSheet product={product} onClose={close} />;
};

// optionId → the chosen value, or true for an option without values (a plain add-on)
type Picked = Record<string, string | true>;

/** "Required" / "Optional" next to a choice; red when a required choice was skipped. */
const Tag = ({ required, missed }: { required: boolean; missed?: boolean }) => {
  const { t } = useTranslation('language');
  const [danger, pending, muted] = useCSSVariable(['--color-danger', '--color-pending', '--color-muted']) as string[];
  return (
    // Dark text on soft fills: always readable, in both themes
    <View
      className={cn(
        'h-6.5 justify-center rounded-full px-2.5',
        missed ? 'bg-danger-soft' : required ? 'bg-pending-soft' : 'bg-surface-secondary',
      )}
    >
      {/* The colour through style: it changes when a required choice is skipped */}
      <Text
        className="text-xs font-semibold"
        style={{ color: missed ? danger : required ? pending : muted }}
        numberOfLines={1}
      >
        {required ? t('mainPage.Required') : t('mainPage.optional')}
      </Text>
    </View>
  );
};

const ProductDetails = ({
  product,
  onDone,
  onConfigured,
}: {
  product: IMenuProduct;
  onDone: () => void;
  onConfigured?: (item: IOrderItem) => void;
}) => {
  const { t } = useTranslation('language');
  const [foreground, accentForeground, muted, accent, surface, border] = useThemeColor([
    'foreground',
    'accent-foreground',
    'muted',
    'accent',
    'surface',
    'border',
  ]);
  const addItem = useCartStore((s) => s.addItem);
  const orderable = useSessionStore((s) => s.participant?.orderable === true);
  const hidePrice = useSessionStore((s) => s.config?.hidePrice === true);
  const opened = useOpened();

  const variants = product.variants ?? [];
  const [variantId, setVariantId] = useState(variants[0]?.id);
  const [picked, setPicked] = useState<Picked>({});
  const [quantity, setQuantity] = useState(1);
  const [missing, setMissing] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteUsed, setNoteUsed] = useState(false);
  const adding = useRef(false);

  const variant = variants.find((v) => v.id === variantId) ?? variants[0];
  const options = variant?.options ?? [];
  const addOns = options.filter((o) => !o.values?.length);
  const choices = options.filter((o) => o.values?.length);
  // Either way it can't be added; only a sold-out one says Дууссан on its button
  const unavailable = isUnavailable(product);
  const soldOut = isSoldOut(product);

  const chosen = options
    .filter((o) => picked[o.id])
    .map((o) => ({
      id: o.id,
      name: o.name,
      price: o.price,
      type: o.type,
      value: picked[o.id] === true ? undefined : picked[o.id],
    }));
  const unitPrice = (variant?.salePrice ?? 0) + chosen.reduce((sum, o) => sum + (o.price || 0), 0);

  const pickVariant = (id: string) => {
    setVariantId(id);
    setPicked({});
    setMissing([]);
  };

  const toggle = (option: IMenuOption, value?: string) => {
    setMissing((ids) => ids.filter((id) => id !== option.id));
    setPicked((current) => {
      const next = { ...current };
      const target = value ?? true;
      if (current[option.id] === target) delete next[option.id];
      else next[option.id] = target;
      return next;
    });
  };

  const add = () => {
    if (!variant || adding.current) return;
    const missingIds = options.filter((o) => o.mandatory && !picked[o.id]).map((o) => o.id);
    if (missingIds.length) return setMissing(missingIds);
    // A second tap while it closes doesn't add it twice
    adding.current = true;

    const item: IOrderItem = {
      id: variant.id,
      uuid: generateUUID(),
      productId: product.productId,
      name: product.name,
      variantName: variants.length > 1 ? variant.name : undefined,
      price: variant.salePrice,
      quantity,
      options: chosen,
      image: product.image ?? '',
      comment,
      discount: 0,
      reason: '',
      state: 'DRAFT',
    };
    // Felt at once, but the sheet closes before the cart changes: the card's stepper and the order
    // bar redraw after the close animation rather than during it
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onDone();
    whenClosed(() => (onConfigured ? onConfigured(item) : addItem(item)));
  };

  const optionPrice = (price: number) => (price ? `+${formatMoney(price)}` : t('mainPage.free'));

  return (
    <>
      <Image
        source={product.image ? { uri: getCdnImageUrl(product.image, 'md') } : require('@/assets/images/noImage.jpg')}
        className="h-full w-100 bg-surface-tertiary"
        contentFit="cover"
        transition={150}
      />

      <View className="flex-1">
        <View className="flex-row items-start justify-between gap-4 px-7 pt-6">
          <View className="flex-1 gap-1.5">
            <Dialog.Title className="text-3xl font-bold leading-tight tracking-tight">{product.name}</Dialog.Title>
            {!!product.description && (
              <Text className="text-base leading-normal text-muted">{product.description}</Text>
            )}
          </View>
          <Button
            isIconOnly
            variant="secondary"
            className="size-12 rounded-full"
            onPress={onDone}
            accessibilityLabel={t('mainPage.close')}
          >
            <X size={22} color={foreground} />
          </Button>
        </View>

        <ScrollView className="flex-1" contentContainerClassName="gap-6 px-7 py-5">
          {opened && !!product.specification && (
            <RenderHtml
              contentWidth={480}
              source={{ html: product.specification }}
              baseStyle={{ color: muted, fontSize: 15, fontFamily: 'Onest_400Regular' }}
              // Descriptions pasted into the panel's editor carry black text (and white highlights)
              // that came out black on black in dark mode: the theme's colours only
              ignoredStyles={['color', 'backgroundColor', 'fontFamily']}
            />
          )}

          {variants.length > 1 && (
            <View className="gap-2.5">
              <View className="flex-row items-center gap-2.5">
                <Text className="text-lg font-bold">{t('mainPage.Variants')}</Text>
                <Tag required />
              </View>
              <View className="flex-row flex-wrap gap-2.5">
                {variants.map((v) => {
                  const active = v.id === variant?.id;
                  return (
                    <Pressable
                      // Drawn anew when picked or not (see the option pills below)
                      key={`${v.id}-${active}`}
                      onPress={() => pickVariant(v.id)}
                      android_ripple={RIPPLE}
                      className={cn(
                        'min-h-18 min-w-44 justify-center gap-0.5 overflow-hidden rounded-[18px] px-4 py-2.5',
                        active ? 'border-2 border-accent bg-accent-tint' : 'border border-border bg-surface',
                      )}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                    >
                      <Text className={active ? 'font-bold' : 'font-semibold'}>{v.name}</Text>
                      {!hidePrice && <Text className="text-sm text-muted">{formatMoney(v.salePrice)}</Text>}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {choices.map((option) => (
            <View key={option.id} className="gap-2.5">
              <View className="flex-row items-center gap-2.5">
                <Text className="text-lg font-bold">{option.name}</Text>
                <Tag required={option.mandatory} missed={missing.includes(option.id)} />
                {!hidePrice && !!option.price && (
                  <Text className="text-base text-muted">{optionPrice(option.price)}</Text>
                )}
              </View>
              <View className="flex-row flex-wrap gap-2.5">
                {option.values.map((value: string) => {
                  const active = picked[option.id] === value;
                  return (
                    <Pressable
                      // Drawn anew when picked or not, with every colour set directly: a pill whose
                      // fill changed while on screen came out plain yellow, its label gone
                      key={`${value}-${active}`}
                      onPress={() => toggle(option, value)}
                      android_ripple={RIPPLE}
                      // Selected = brand yellow, like the selected category in the rail
                      className="h-12 justify-center overflow-hidden rounded-full border px-5"
                      style={{ backgroundColor: active ? accent : surface, borderColor: active ? accent : border }}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                    >
                      <Text
                        className={active ? 'font-bold' : 'font-semibold'}
                        style={{ color: active ? accentForeground : foreground }}
                        numberOfLines={1}
                      >
                        {value}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          {addOns.length > 0 && (
            <View className="gap-2.5">
              <View className="flex-row items-center gap-2.5">
                <Text className="text-lg font-bold">{t('mainPage.extra')}</Text>
                <Tag required={false} />
              </View>
              {addOns.map((option) => {
                const active = !!picked[option.id];
                const missed = missing.includes(option.id);
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => toggle(option)}
                    android_ripple={RIPPLE}
                    className={cn(
                      'min-h-14 flex-row items-center gap-3.5 overflow-hidden rounded-2xl bg-surface px-4',
                      missed ? 'border-2 border-danger' : active ? 'border-2 border-accent' : 'border border-border',
                    )}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: active }}
                  >
                    <View
                      // Drawn anew when ticked or not (see the option pills above)
                      key={`box-${active}`}
                      className={cn(
                        'size-6 items-center justify-center rounded-md',
                        active ? 'bg-accent' : 'border-2 border-separator',
                      )}
                    >
                      {active && <Check size={16} color={accentForeground} strokeWidth={3} />}
                    </View>
                    <Text className="flex-1">
                      {option.name}
                      {option.mandatory && <Text className="text-danger"> *</Text>}
                    </Text>
                    {!hidePrice && <Text className="text-base text-muted">{optionPrice(option.price)}</Text>}
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* A note for the kitchen ("no onion"), written in a small dialog that stays above the keyboard */}
          {orderable && !unavailable && (
            <View className="gap-2.5">
              <View className="flex-row items-center gap-2.5">
                <Text className="text-lg font-bold">{t('mainPage.note')}</Text>
                <Tag required={false} />
              </View>
              <Pressable
                onPress={() => {
                  setNoteUsed(true);
                  setNoteOpen(true);
                }}
                android_ripple={RIPPLE}
                accessibilityRole="button"
                accessibilityLabel={t('mainPage.note')}
                className={cn(
                  'min-h-14 flex-row items-center gap-3 overflow-hidden rounded-2xl bg-surface px-4 py-3',
                  comment ? 'border-2 border-accent' : 'border border-border',
                )}
              >
                <MessageSquareText size={20} color={muted} />
                <Text className="flex-1" style={{ color: comment ? foreground : muted }} numberOfLines={2}>
                  {comment || t('mainPage.note_placeholder')}
                </Text>
                <Pencil size={18} color={muted} />
              </Pressable>
            </View>
          )}

          {/* What goes with it, while the guest is choosing (not when picking a dish for a gift) */}
          {opened && orderable && !unavailable && !onConfigured && <Pairings product={product} />}

          {missing.length > 0 && (
            <Text className="font-semibold text-danger">
              {t('mainPage.validation.mandatoryOptions', {
                options: options
                  .filter((o) => missing.includes(o.id))
                  .map((o) => o.name)
                  .join(', '),
              })}
            </Text>
          )}
        </ScrollView>

        {orderable && (
          <View className="flex-row items-center gap-4 border-t border-border px-7 pb-6 pt-4">
            <Stepper
              size="lg"
              quantity={quantity}
              onIncrease={() => setQuantity((q) => q + 1)}
              onDecrease={() => setQuantity((q) => Math.max(1, q - 1))}
            />
            <Button
              size="lg"
              isDisabled={unavailable || !variant}
              variant={unavailable ? 'secondary' : 'primary'}
              className="min-h-16 flex-1 justify-between rounded-2xl px-5.5"
              onPress={add}
            >
              <Button.Label numberOfLines={1} className="text-lg font-bold">
                {soldOut ? t('mainPage.soldOut') : onConfigured ? t('mainPage.confirm') : t('mainPage.add')}
              </Button.Label>
              {!hidePrice && !unavailable && (
                <Button.Label numberOfLines={1} className="text-lg font-bold">{formatMoney(unitPrice * quantity)}</Button.Label>
              )}
            </Button>
          </View>
        )}
      </View>

      {/* Built the first time it's needed (few guests write one), then kept so it animates closed */}
      {noteUsed && (
        <NoteDialog
          target={noteOpen ? { name: product.name, comment } : null}
          onSave={(next) => {
            setComment(next);
            setNoteOpen(false);
          }}
          onClose={() => setNoteOpen(false)}
        />
      )}
    </>
  );
};
