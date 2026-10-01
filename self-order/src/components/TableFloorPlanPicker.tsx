import React, { useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Icon } from 'react-native-paper';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { useThemeStore } from '@/src/store/theme.store';
import { useGiftTheme } from '@/src/hooks/useGiftTheme';
import { ITable, ITableShape } from '@/src/types/table';

type Props = {
  tables: ITable[];
  ownTableId?: string | null;
  highlightTableId?: string | null;
  onSelect?: (table: ITable) => void;
  compact?: boolean;
  senderGlyph?: string;
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const CANVAS_HEIGHT = 320;
const COMPACT_CANVAS_HEIGHT = 210;
const SCROLL_MAX_HEIGHT = Math.max(SCREEN_HEIGHT * 0.6, 520);
const PADDING = 16;
const MIN_SIZE = 54;
const MAX_SCALE = 1.6;

const HighlightPulse = ({ borderRadius, color }: { borderRadius: number; color: string }) => {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false);
    return () => cancelAnimation(pulse);
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 0.5 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { borderRadius, backgroundColor: color }, style]}
    />
  );
};

const shapeBounds = (shape: ITableShape) => {
  if (shape.type === 'circle') {
    return {
      minX: shape.x - shape.radius,
      maxX: shape.x + shape.radius,
      minY: shape.y - shape.radius,
      maxY: shape.y + shape.radius,
    };
  }
  return {
    minX: shape.x,
    maxX: shape.x + shape.width,
    minY: shape.y,
    maxY: shape.y + shape.height,
  };
};

const TableFloorPlanPicker = ({
  tables,
  ownTableId,
  highlightTableId,
  onSelect,
  compact,
  senderGlyph = 'gift-outline',
}: Props) => {
  const { t } = useTranslation('language');
  const { theme } = useThemeStore();

  const g = useGiftTheme();
  const accent = g.goldText;
  const onAccent = g.isDark ? g.onGold : '#fff';

  const sections = useMemo(() => {
    const groups = new Map<string, { id: string; name: string; tables: ITable[] }>();
    tables.forEach((table) => {
      const key = table.section?.id ?? 'other';
      const name = table.section?.name ?? t('mainPage.other', 'Other');
      if (!groups.has(key)) groups.set(key, { id: key, name, tables: [] });
      groups.get(key)!.tables.push(table);
    });

    const all = Array.from(groups.values());
    if (!highlightTableId) return all;

    const owning = all.filter((s) => s.tables.some((tb) => tb.id === highlightTableId));
    return owning.length > 0 ? owning : all;
  }, [tables, t, highlightTableId]);

  const canvasHeight = compact ? COMPACT_CANVAS_HEIGHT : CANVAS_HEIGHT;

  const senderTable = highlightTableId ? tables.find((tb) => tb.id === highlightTableId) : undefined;

  return (
    <View style={styles.root}>
      {senderTable ? (
        <View style={[styles.senderHeader, { backgroundColor: accent + '14', borderColor: accent + '4d' }]}>
          <View style={[styles.senderChip, { backgroundColor: accent }]}>
            <Icon source={senderGlyph} size={17} color={onAccent} />
            <Text style={[styles.senderChipText, { color: onAccent }]} numberOfLines={1}>
              {senderTable.name}
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendDotOwn]} />
            <Text style={[styles.legendText, { color: theme.textMuted }]} numberOfLines={1}>
              {t('mainPage.legend_you', 'You are here')}
            </Text>
          </View>
        </View>
      ) : (
        <View style={[styles.legend, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.primary }]} />
            <Text style={[styles.legendText, { color: theme.textMuted }]}>{t('mainPage.legend_tables', 'Tables')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendDotOwn]} />
            <Text style={[styles.legendText, { color: theme.textMuted }]}>
              {t('mainPage.legend_you', 'You are here')}
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        style={[styles.scroll, compact && { maxHeight: canvasHeight + 40 }]}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={!compact || sections.length > 1}
      >
        {sections.map((section) => (
          <SectionFloorPlan
            key={section.id}
            name={section.name}
            tables={section.tables}
            ownTableId={ownTableId}
            highlightTableId={highlightTableId}
            onSelect={onSelect}
            canvasHeight={canvasHeight}
            theme={theme}
            accent={accent}
            onAccent={onAccent}
            t={t}
          />
        ))}
      </ScrollView>
    </View>
  );
};

export default TableFloorPlanPicker;

const SectionFloorPlan = ({
  tables,
  ownTableId,
  highlightTableId,
  onSelect,
  canvasHeight,
  theme,
  accent,
  onAccent,
  t,
}: {
  name: string;
  tables: ITable[];
  ownTableId?: string | null;
  highlightTableId?: string | null;
  onSelect?: (table: ITable) => void;
  canvasHeight: number;
  theme: any;
  accent: string;
  onAccent: string;
  t: any;
}) => {
  const [canvasWidth, setCanvasWidth] = React.useState(0);

  const shaped = tables.filter((table) => !!table.shape);
  const unshaped = tables.filter((table) => !table.shape);

  const layout = useMemo(() => {
    if (canvasWidth === 0 || shaped.length === 0) return null;

    const bounds = shaped.map((table) => shapeBounds(table.shape!));
    const minX = Math.min(...bounds.map((b) => b.minX));
    const maxX = Math.max(...bounds.map((b) => b.maxX));
    const minY = Math.min(...bounds.map((b) => b.minY));
    const maxY = Math.max(...bounds.map((b) => b.maxY));

    const spanX = Math.max(maxX - minX, 1);
    const spanY = Math.max(maxY - minY, 1);

    const scale = Math.min((canvasWidth - PADDING * 2) / spanX, (canvasHeight - PADDING * 2) / spanY, MAX_SCALE);

    const contentWidth = spanX * scale;
    const contentHeight = spanY * scale;
    const offsetX = PADDING + (canvasWidth - PADDING * 2 - contentWidth) / 2;
    const offsetY = PADDING + (canvasHeight - PADDING * 2 - contentHeight) / 2;

    return { minX, minY, scale, offsetX, offsetY };
  }, [canvasWidth, shaped, canvasHeight]);

  return (
    <View style={styles.sectionWrap}>
      {shaped.length > 0 && (
        <View
          style={[
            styles.canvas,
            {
              height: canvasHeight,
              borderColor: highlightTableId ? accent + '4d' : theme.border,
              backgroundColor: theme.backgroundSecondary,
            },
          ]}
          onLayout={(e) => setCanvasWidth(e.nativeEvent.layout.width)}
        >
          {layout &&
            shaped.map((table) => {
              const isOwn = table.id === ownTableId;
              const shape = table.shape!;
              const toX = (x: number) => layout.offsetX + (x - layout.minX) * layout.scale;
              const toY = (y: number) => layout.offsetY + (y - layout.minY) * layout.scale;

              const isCircle = shape.type === 'circle';
              const size = isCircle ? Math.max(shape.radius * 2 * layout.scale, MIN_SIZE) : undefined;
              const width = isCircle ? size : Math.max(shape.width * layout.scale, MIN_SIZE);
              const height = isCircle ? size : Math.max(shape.height * layout.scale, MIN_SIZE);
              const left = isCircle ? toX(shape.x) - width! / 2 : toX(shape.x);
              const top = isCircle ? toY(shape.y) - height! / 2 : toY(shape.y);
              const radius = isCircle ? width! / 2 : 10;

              if (isOwn) {
                return (
                  <View key={table.id} style={[styles.tableShape, { left, top, width, height }]} pointerEvents="none">
                    <View style={[styles.ownShapeBase, { width, height, borderRadius: radius }]}>
                      <Text style={styles.ownTagText} numberOfLines={2}>
                        {t('mainPage.legend_you', 'Your table')}
                      </Text>
                    </View>
                    <BlurView
                      intensity={35}
                      tint="light"
                      style={[StyleSheet.absoluteFillObject, { borderRadius: radius, overflow: 'hidden' }]}
                    />
                  </View>
                );
              }

              const isHighlighted = !!highlightTableId && table.id === highlightTableId;

              if (isHighlighted || !onSelect) {
                return (
                  <React.Fragment key={table.id}>
                    {isHighlighted && (
                      <View pointerEvents="none" style={[styles.tableShape, { left, top, width, height }]}>
                        <HighlightPulse borderRadius={radius} color={accent} />
                      </View>
                    )}
                    <View
                      pointerEvents="none"
                      style={[
                        styles.tableShape,
                        styles.tableShapeSelectable,
                        {
                          left,
                          top,
                          width,
                          height,
                          borderRadius: radius,
                          backgroundColor: isHighlighted ? accent : theme.primary,
                          transform: [{ rotate: `${shape.rotation || 0}deg` }],
                        },
                        isHighlighted && [styles.tableShapeHighlighted, { shadowColor: accent }],
                      ]}
                    >
                      <Text style={[styles.tableShapeText, isHighlighted && { color: onAccent }]} numberOfLines={1}>
                        {table.name}
                      </Text>
                    </View>
                  </React.Fragment>
                );
              }

              return (
                <TouchableOpacity
                  key={table.id}
                  onPress={() => onSelect(table)}
                  activeOpacity={0.7}
                  style={[
                    styles.tableShape,
                    styles.tableShapeSelectable,
                    {
                      left,
                      top,
                      width,
                      height,
                      borderRadius: radius,
                      backgroundColor: theme.primary,
                      transform: [{ rotate: `${shape.rotation || 0}deg` }],
                    },
                  ]}
                >
                  <Text style={styles.tableShapeText} numberOfLines={1}>
                    {table.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
        </View>
      )}

      {unshaped.length > 0 && (
        <View style={styles.chipRow}>
          {unshaped.map((table) => {
            const isOwn = table.id === ownTableId;
            if (isOwn) {
              return (
                <View key={table.id} style={[styles.chip, styles.chipOwn]}>
                  <Text style={styles.chipOwnText}>{t('mainPage.legend_you', 'Your table')}</Text>
                </View>
              );
            }
            if ((highlightTableId && table.id === highlightTableId) || !onSelect) {
              const isHighlighted = !!highlightTableId && table.id === highlightTableId;
              return (
                <View
                  key={table.id}
                  style={[
                    styles.chip,
                    isHighlighted ? { backgroundColor: accent, borderColor: accent } : { borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.chipText, { color: isHighlighted ? onAccent : theme.text }]}>{table.name}</Text>
                </View>
              );
            }
            return (
              <TouchableOpacity
                key={table.id}
                style={[styles.chip, { borderColor: theme.border }]}
                onPress={() => onSelect(table)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, { color: theme.text }]}>{table.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { width: '100%', alignSelf: 'stretch' },
  legend: {
    flexDirection: 'row',
    gap: 24,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  senderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  senderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },

  senderChipText: { fontSize: 19, fontWeight: '800' },
  senderHeaderMeta: { flex: 1 },
  senderHeaderLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  senderHeaderSection: { fontSize: 17, fontWeight: '700', marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  legendDot: { width: 16, height: 16, borderRadius: 8 },
  legendDotOwn: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#cbd5e1',
    borderWidth: 1,
    borderColor: '#94a3b8',
  },
  legendText: { fontSize: 17, fontWeight: '600' },
  scroll: { width: '100%', maxHeight: SCROLL_MAX_HEIGHT },
  scrollContent: { paddingBottom: 8 },
  sectionWrap: { marginBottom: 22 },
  canvas: {
    width: '100%',
    height: CANVAS_HEIGHT,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  tableShape: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tableShapeSelectable: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  tableShapeText: { color: '#fff', fontSize: 19, fontWeight: '700', textAlign: 'center' },
  tableShapeHighlighted: {
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 10,
    shadowOpacity: 0.9,
    shadowRadius: 10,
  },
  ownShapeBase: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#94a3b8',
    borderWidth: 2,
    borderColor: '#64748b',
    borderStyle: 'dashed',
    opacity: 0.85,
  },

  ownTagText: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center', paddingHorizontal: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14 },
  chip: { borderWidth: 1, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 18 },
  chipText: { fontSize: 19, fontWeight: '600' },
  chipOwn: {
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderStyle: 'dashed',
    backgroundColor: '#e2e8f0',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  chipOwnText: { fontSize: 17, fontWeight: '700', color: '#475569' },
});
