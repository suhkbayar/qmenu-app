import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useToast } from 'react-native-toast-notifications';
import { Icon } from 'react-native-paper';
import { useLazyQuery } from '@apollo/client';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
  withDelay,
  cancelAnimation,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { GET_ACTIVE_TABLES } from '@/src/graphql/queries/tableMessage';
import { SEND_TABLE_REQUEST } from '@/src/graphql/mutations/tableRequest';
import { TABLE_MESSAGE_STICKERS, GIFT_EMOJI, MESSAGE_EMOJI, EmojiAnim } from '@/src/constants';
import { useGiftTheme } from '@/src/hooks/useGiftTheme';
import { getPayload } from '@/src/providers/auth';
import apolloClient from '@/src/providers/apolloClient';
import TableFloorPlanPicker from '@/src/components/TableFloorPlanPicker';
import { ITable } from '@/src/types/table';
import { useTableMessageStore } from '@/src/store/tableMessage.store';
import AnimatedEmoji from '@/src/components/ui/AnimatedEmoji';
import EmojiBurst from '@/src/components/ui/EmojiBurst';
import Medallion from '@/src/components/ui/Medallion';

export interface TableMessageToastProps {
  id?: string;
  giftId?: string;
  stickerId?: string | null;
  fromTableId?: string | null;
  fromTableName: string;

  isAnonymous?: boolean;
  itemsSummary?: string | null;
  isGift?: boolean;
  isReply?: boolean;
  isSitRequest?: boolean;
  sitAccepted?: boolean | null;
}

const TableMessageToast: React.FC<TableMessageToastProps> = ({
  id,
  giftId,
  stickerId,
  fromTableId,
  fromTableName,
  isAnonymous,
  itemsSummary,
  isGift,
  isReply,
  isSitRequest,
  sitAccepted,
}) => {
  const { t } = useTranslation('language');
  const toast = useToast();
  const g = useGiftTheme();
  const openComposer = useTableMessageStore((s) => s.openComposer);

  const [showPlan, setShowPlan] = useState(false);
  const [ownTableId, setOwnTableId] = useState<string | null>(null);
  const [loadTables, { data: tablesData, loading: tablesLoading }] = useLazyQuery(GET_ACTIVE_TABLES, {
    fetchPolicy: 'cache-first',
  });

  const sticker = TABLE_MESSAGE_STICKERS.find((s) => s.id === stickerId);
  const isSitReply = sitAccepted !== null && sitAccepted !== undefined;
  // Sit events carry no sticker, so they used to fall through to the love letter.
  // Show the feature's own mark instead.
  const isSitEvent = isSitRequest || isSitReply;
  const emoji = sticker?.emoji ?? (isGift ? GIFT_EMOJI : MESSAGE_EMOJI);
  const anim: EmojiAnim = sticker?.anim ?? (isGift ? 'pop' : 'float');

  const seal = useSharedValue(0);
  const sheen = useSharedValue(0);

  useEffect(() => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    seal.value = withSequence(
      withTiming(1.18, { duration: 180, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 9, stiffness: 130 }),
    );
    sheen.value = withDelay(260, withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }));

    return () => {
      cancelAnimation(seal);
      cancelAnimation(sheen);
    };
  }, []);

  const sealStyle = useAnimatedStyle(() => ({ transform: [{ scale: seal.value }] }));
  const sheenStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sheen.value, [0, 0.4, 1], [0, 0.5, 0]),
    transform: [{ translateX: interpolate(sheen.value, [0, 1], [-260, 340]) }, { rotate: '18deg' }],
  }));

  const togglePlan = () => {
    if (!showPlan) {
      loadTables();
      getPayload().then((payload) => setOwnTableId(payload?.table ?? null));
    }
    setShowPlan((prev) => !prev);
  };

  const dismiss = () => {
    if (id) toast.hide(id);
  };

  const reply = () => {
    if (!fromTableId) return;
    dismiss();
    openComposer({ id: fromTableId, name: fromTableName }, giftId ?? null);
  };

  const answerSit = async (accepted: boolean) => {
    if (!fromTableId) return;

    try {
      const res = await apolloClient.mutate({
        mutation: SEND_TABLE_REQUEST,
        variables: { input: { toTableId: fromTableId, accepted } },
      });
      if (res?.data?.sendTableRequest) {
        toast.show(
          accepted
            ? t('mainPage.sit_reply_sent_yes', { table: fromTableName, defaultValue: `You accepted ${fromTableName}` })
            : t('mainPage.sit_reply_sent_no', 'Declined'),
          { type: accepted ? 'success' : 'normal', placement: 'top', duration: 3000 },
        );
      }
    } catch (error: any) {
      toast.show(error?.message, { type: 'danger', placement: 'top', duration: 4000 });
    } finally {
      dismiss();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: g.surface, borderColor: g.hairline }]}>
      <View style={[styles.goldRule, { backgroundColor: g.gold }]} />
      <Animated.View pointerEvents="none" style={[styles.sheen, { backgroundColor: g.goldBright }, sheenStyle]} />

      <View style={styles.inner}>
        <TouchableOpacity
          onPress={dismiss}
          style={styles.closeButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Icon source="close" size={24} color={g.textFaint} />
        </TouchableOpacity>

        <View style={styles.headRow}>
          <Animated.View style={[styles.hero, sealStyle]}>
            {isSitEvent ? (
              <Medallion glyph="account-multiple" size={92} solid />
            ) : (
              <>
                <EmojiBurst emoji={emoji} />
                <AnimatedEmoji emoji={emoji} anim={anim} size={70} />
              </>
            )}
          </Animated.View>

          <View style={styles.content}>
            {isGift && (
              <Text style={[styles.eyebrow, { color: g.goldText }]}>
                {t('mainPage.gift_toast_eyebrow', 'A gift for your table')}
              </Text>
            )}

            <View style={styles.fromRow}>
              <View style={[styles.fromLine, { backgroundColor: g.hairline }]} />
              <Text style={[styles.tableName, { color: g.text }]} numberOfLines={1}>
                {isAnonymous
                  ? t('mainPage.toast_from_anonymous', 'Someone')
                  : t('mainPage.toast_from_table', { table: fromTableName, defaultValue: `Table ${fromTableName}` })}
              </Text>
              <View style={[styles.fromLine, { backgroundColor: g.hairline }]} />
            </View>

            {isSitRequest && (
              <Text style={[styles.message, { color: g.text }]} numberOfLines={3}>
                “{t('mainPage.sit_question', 'Shall we sit together?')}”
              </Text>
            )}

            {isSitReply && (
              <Text style={[styles.message, { color: g.text }]} numberOfLines={3}>
                {sitAccepted
                  ? t('mainPage.sit_accepted', 'They said yes!')
                  : t('mainPage.sit_declined', 'Maybe another time')}
              </Text>
            )}

            {!!sticker && !isSitRequest && (
              <Text style={[styles.message, { color: g.text }]} numberOfLines={3}>
                “{t(`mainPage.${sticker.labelKey}`)}”
              </Text>
            )}

            {!!itemsSummary && (
              <View style={[styles.itemsBox, { backgroundColor: g.raised, borderColor: g.hairline }]}>
                <Text style={[styles.itemsSummary, { color: g.textSoft }]} numberOfLines={2}>
                  {itemsSummary}
                </Text>
              </View>
            )}
          </View>
        </View>

        {isSitRequest && !!fromTableId && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={() => answerSit(true)}
              activeOpacity={0.85}
              style={[styles.replyButton, { backgroundColor: g.gold }]}
            >
              <Icon source="check" size={20} color={g.onGold} />
              <Text style={[styles.replyText, { color: g.onGold }]}>{t('mainPage.sit_yes', 'Yes')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => answerSit(false)}
              activeOpacity={0.7}
              style={[styles.ghostButton, { borderColor: g.hairline }]}
            >
              <Icon source="close" size={19} color={g.goldText} />
              <Text style={[styles.ghostText, { color: g.goldText }]}>{t('mainPage.sit_no', 'Not now')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isSitRequest && !isSitReply && !!fromTableId && !isReply && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={reply}
              activeOpacity={0.85}
              style={[styles.replyButton, { backgroundColor: g.gold }]}
            >
              <Icon source="reply" size={20} color={g.onGold} />
              <Text style={[styles.replyText, { color: g.onGold }]}>{t('mainPage.reply_action', 'Reply')}</Text>
            </TouchableOpacity>

            {/* An anonymous sender's table is exactly what the plan would give away. */}
            {!isAnonymous && (
              <TouchableOpacity
                onPress={togglePlan}
                activeOpacity={0.7}
                style={[styles.ghostButton, { borderColor: g.hairline }]}
              >
                <Icon source={showPlan ? 'chevron-up' : 'map-marker-radius'} size={19} color={g.goldText} />
                <Text style={[styles.ghostText, { color: g.goldText }]}>
                  {showPlan
                    ? t('mainPage.hide_sender_location', 'Hide location')
                    : t('mainPage.show_sender_location', 'Where is it from?')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {showPlan && !isAnonymous && !!fromTableId && (
          <View style={styles.planWrap}>
            {tablesLoading ? (
              <ActivityIndicator animating size="large" color={g.goldText} style={styles.planLoader} />
            ) : (
              <TableFloorPlanPicker
                tables={(tablesData?.getActiveTables ?? []) as ITable[]}
                ownTableId={ownTableId}
                highlightTableId={fromTableId}
                compact
              />
            )}
          </View>
        )}
      </View>
    </View>
  );
};

export default TableMessageToast;

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    marginHorizontal: 16,
    minWidth: 560,
    maxWidth: 720,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 26,
  },
  goldRule: { height: 3 },
  sheen: {
    position: 'absolute',
    top: -40,
    bottom: -40,
    width: 90,
  },
  inner: { padding: 26 },
  closeButton: { position: 'absolute', top: 14, right: 14, zIndex: 2, padding: 4 },

  headRow: { flexDirection: 'row', alignItems: 'center', gap: 22 },
  hero: { width: 104, height: 104, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, paddingRight: 26 },
  // Real Inter family, not fontWeight — the default family is Inter-Regular, so a
  // numeric weight never reaches the loaded Inter-SemiBold/ExtraBold files.
  eyebrow: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
  },
  fromRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  fromLine: { width: 22, height: 1 },
  tableName: { fontSize: 34, fontWeight: '800', letterSpacing: 0.6 },
  message: { fontSize: 30, fontWeight: '700', lineHeight: 40, marginTop: 16 },
  itemsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  itemsSummary: { flex: 1, fontSize: 22, fontWeight: '700' },

  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 22 },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 24,
  },
  replyText: { fontSize: 18, fontWeight: '800', letterSpacing: 0.4 },
  ghostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  ghostText: { fontSize: 16, fontWeight: '700' },

  planWrap: { marginTop: 20 },
  planLoader: { marginVertical: 30 },
});
