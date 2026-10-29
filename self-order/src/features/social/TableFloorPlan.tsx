import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { cn, useThemeColor } from 'heroui-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { getPayload } from '@/src/providers/auth';
import { ITable, ITableShape } from '@/src/types/table';
import { Text } from '@/src/ui/Text';

/** This tablet's table (from its login), to mark "Your table" on the plan. */
export const useOwnTableId = () => {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    getPayload().then((payload) => setId(payload?.table ?? null));
  }, []);
  return id;
};

type Props = {
  tables: ITable[];
  ownTableId?: string | null;
  /** The picked table, or the one a message came from: filled with `color` */
  markedId?: string | null;
  /** The gift red or the sit-together teal */
  color: string;
  /** Without it the plan is display-only */
  onSelect?: (table: ITable) => void;
  /** Small and fixed height, showing only the marked table's section: where a message came from */
  compact?: boolean;
  /** Ripple out from the marked table a few times when the plan appears */
  pulse?: boolean;
};

// Light text on the marked table's colour, as a fixed colour: theme text colours on fills were unreliable
const ON_COLOR = '#FFFFFF';
// Android's own touch ripple: tables and tabs are plain views, not one animated button each
const RIPPLE = { color: 'rgba(0,0,0,0.12)', foreground: true };

const shapeBounds = (shape: ITableShape) =>
  shape.type === 'circle'
    ? {
        minX: shape.x - shape.radius,
        maxX: shape.x + shape.radius,
        minY: shape.y - shape.radius,
        maxY: shape.y + shape.radius,
      }
    : { minX: shape.x, maxX: shape.x + shape.width, minY: shape.y, maxY: shape.y + shape.height };

/** The restaurant's floor plan, one section at a time, drawn to fit. Tables without a shape show as chips. */
export const TableFloorPlan = ({ tables, ownTableId, markedId, color, onSelect, compact, pulse }: Props) => {
  const { t } = useTranslation('language');
  const [foreground, accentForeground] = useThemeColor(['foreground', 'accent-foreground']);

  const sections = useMemo(() => {
    const groups = new Map<string, { id: string; name: string; tables: ITable[] }>();
    for (const table of tables) {
      const id = table.section?.id ?? 'other';
      if (!groups.has(id)) groups.set(id, { id, name: table.section?.name ?? t('mainPage.other'), tables: [] });
      groups.get(id)!.tables.push(table);
    }
    return [...groups.values()];
  }, [tables, t]);

  // Start on the section with the marked table, else the guest's own, else the first
  const startId =
    sections.find((s) => s.tables.some((tb) => tb.id === markedId))?.id ??
    sections.find((s) => s.tables.some((tb) => tb.id === ownTableId))?.id ??
    sections[0]?.id;
  const [activeId, setActiveId] = useState(startId);
  const section = sections.find((s) => s.id === activeId) ?? sections[0];

  return (
    <View className={cn('gap-3', compact ? 'h-54' : 'flex-1')}>
      {!compact && sections.length > 1 && (
        <ScrollView
          horizontal
          className="grow-0"
          contentContainerClassName="gap-2"
          showsHorizontalScrollIndicator={false}
        >
          {sections.map((s) => {
            const active = s.id === section?.id;
            return (
              <Pressable
                // Drawn anew when picked or not: a chip whose fill changed on screen lost its label
                key={`${s.id}-${active}`}
                onPress={() => setActiveId(s.id)}
                android_ripple={RIPPLE}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                className={cn(
                  'h-11 justify-center overflow-hidden rounded-full px-4',
                  active ? 'bg-accent' : 'border border-border bg-surface',
                )}
              >
                {/* Colour set directly: a changing colour class came out wrong on the tablets */}
                <Text
                  className={active ? 'font-bold' : 'font-medium'}
                  style={{ color: active ? accentForeground : foreground }}
                  numberOfLines={1}
                >
                  {s.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      {section && (
        <SectionPlan
          key={section.id}
          tables={section.tables}
          ownTableId={ownTableId}
          markedId={markedId}
          color={color}
          onSelect={onSelect}
          compact={compact}
          pulse={pulse}
        />
      )}
    </View>
  );
};

type TableState = 'own' | 'marked' | 'idle';

const SectionPlan = ({ tables, ownTableId, markedId, color, onSelect, compact, pulse }: Props) => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const shaped = useMemo(() => tables.filter((table) => !!table.shape), [tables]);
  const unshaped = useMemo(() => tables.filter((table) => !table.shape), [tables]);
  const stateOf = (table: ITable): TableState =>
    table.id === ownTableId ? 'own' : table.id === markedId ? 'marked' : 'idle';

  const padding = compact ? 12 : 24;
  const minSize = compact ? 34 : 54;

  // Fit every table's shape into the canvas, centred, without scaling up too far
  const layout = useMemo(() => {
    if (!size.width || !size.height || !shaped.length) return null;
    const bounds = shaped.map((table) => shapeBounds(table.shape!));
    const minX = Math.min(...bounds.map((b) => b.minX));
    const minY = Math.min(...bounds.map((b) => b.minY));
    const spanX = Math.max(Math.max(...bounds.map((b) => b.maxX)) - minX, 1);
    const spanY = Math.max(Math.max(...bounds.map((b) => b.maxY)) - minY, 1);
    const scale = Math.min(
      (size.width - padding * 2) / spanX,
      (size.height - padding * 2) / spanY,
      compact ? 1 : 1.6,
    );
    return {
      scale,
      x: (x: number) => padding + (size.width - padding * 2 - spanX * scale) / 2 + (x - minX) * scale,
      y: (y: number) => padding + (size.height - padding * 2 - spanY * scale) / 2 + (y - minY) * scale,
    };
  }, [size, shaped, padding, compact]);

  return (
    <View className="flex-1 gap-3">
      {shaped.length > 0 && (
        <View
          className="flex-1 overflow-hidden rounded-[20px] bg-surface-secondary"
          onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        >
          {layout &&
            shaped.map((table) => {
              const shape = table.shape!;
              const circle = shape.type === 'circle';
              const w = Math.max((circle ? shape.radius * 2 : shape.width) * layout.scale, minSize);
              const h = circle ? w : Math.max(shape.height * layout.scale, minSize);
              const frame: Frame = {
                position: 'absolute',
                left: circle ? layout.x(shape.x) - w / 2 : layout.x(shape.x),
                top: circle ? layout.y(shape.y) - h / 2 : layout.y(shape.y),
                width: w,
                height: h,
                borderRadius: circle ? w / 2 : compact ? 9 : 14,
              };
              return (
                <PlanTable
                  key={table.id}
                  table={table}
                  state={stateOf(table)}
                  frame={frame}
                  rotate={`${shape.rotation || 0}deg`}
                  color={color}
                  onSelect={onSelect}
                  compact={compact}
                  pulse={pulse}
                />
              );
            })}
        </View>
      )}

      {unshaped.length > 0 && (
        <View className="flex-row flex-wrap gap-2.5">
          {unshaped.map((table) => (
            <PlanTable
              key={table.id}
              table={table}
              state={stateOf(table)}
              color={color}
              onSelect={onSelect}
              compact={compact}
            />
          ))}
        </View>
      )}
    </View>
  );
};

type Frame = { position: 'absolute'; left: number; top: number; width: number; height: number; borderRadius: number };

/** One table: on the canvas when it has a `frame`, otherwise a chip. */
const PlanTable = ({
  table,
  state,
  frame,
  rotate = '0deg',
  color,
  onSelect,
  compact,
  pulse,
}: {
  table: ITable;
  state: TableState;
  frame?: Frame;
  rotate?: string;
  color: string;
  onSelect?: (table: ITable) => void;
  compact?: boolean;
  pulse?: boolean;
}) => {
  const { t } = useTranslation('language');
  const [foreground, muted] = useThemeColor(['foreground', 'muted']);
  const shape = frame ? 'items-center justify-center px-1' : 'rounded-xl px-4.5 py-3';
  const text = compact ? 'text-base' : 'text-xl';
  const placed = frame ? [frame, { transform: [{ rotate }] }] : undefined;

  if (state === 'own') {
    return (
      <View
        pointerEvents="none"
        className={cn(shape, 'border-2 border-dashed border-separator')}
        style={placed}
      >
        <Text className={cn('self-stretch text-center font-semibold text-muted', compact ? 'text-xs' : 'text-sm')} numberOfLines={2}>
          {t('mainPage.legend_you')}
        </Text>
      </View>
    );
  }

  const marked = state === 'marked';
  const body = (
    // Always the colour through style: one left to a class stayed white after a table was unmarked
    <Text
      className={cn('self-stretch text-center font-bold', text)}
      style={{ color: marked ? ON_COLOR : compact ? muted : foreground }}
      numberOfLines={1}
    >
      {table.name}
    </Text>
  );
  const look = marked ? { backgroundColor: color } : undefined;
  const idle = 'border-[1.5px] border-separator bg-surface';

  return (
    <>
      {marked && frame && <Halo frame={frame} rotate={rotate} color={color} compact={compact} pulse={pulse} />}
      {onSelect ? (
        <Pressable
          onPress={() => onSelect(table)}
          android_ripple={RIPPLE}
          accessibilityRole="button"
          accessibilityLabel={table.name}
          accessibilityState={{ selected: marked }}
          className={cn(shape, 'overflow-hidden', !marked && idle)}
          style={[placed, look]}
        >
          {body}
        </Pressable>
      ) : (
        <View pointerEvents="none" className={cn(shape, !marked && idle)} style={[placed, look]}>
          {body}
        </View>
      )}
    </>
  );
};

/** A soft ring round the marked table; ripples out a few times when asked, then stays still. */
const Halo = ({
  frame,
  rotate,
  color,
  compact,
  pulse,
}: {
  frame: Frame;
  rotate: string;
  color: string;
  compact?: boolean;
  pulse?: boolean;
}) => {
  const ripple = useSharedValue(0);
  useEffect(() => {
    if (!pulse) return;
    ripple.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.out(Easing.quad) }), 3, false);
    return () => cancelAnimation(ripple);
  }, [pulse]);
  const rippleStyle = useAnimatedStyle(() => ({
    opacity: 0.45 * (1 - ripple.value),
    transform: [{ rotate }, { scale: 1 + ripple.value * 0.6 }],
  }));

  // The frame grown by a few dp on every side, corners with it
  const ring = compact ? 5 : 6;
  const halo = {
    ...frame,
    left: frame.left - ring,
    top: frame.top - ring,
    width: frame.width + ring * 2,
    height: frame.height + ring * 2,
    borderRadius: frame.borderRadius + ring,
    backgroundColor: color,
  };

  return (
    <>
      <View pointerEvents="none" style={[halo, { opacity: 0.22, transform: [{ rotate }] }]} />
      {pulse && <Animated.View pointerEvents="none" style={[frame, { backgroundColor: color }, rippleStyle]} />}
    </>
  );
};
