import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, Dimensions } from 'react-native';
import { Modal, Portal, Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { Toast } from 'react-native-toast-notifications';
import { SEND_TABLE_REQUEST } from '@/src/graphql/mutations/tableRequest';
import { GET_ACTIVE_TABLES } from '@/src/graphql/queries/tableMessage';
import apolloClient from '@/src/providers/apolloClient';
import { getPayload } from '@/src/providers/auth';
import { useGiftTheme } from '@/src/hooks/useGiftTheme';
import { useTableMessageStore } from '@/src/store/tableMessage.store';
import TableFloorPlanPicker from '@/src/components/TableFloorPlanPicker';
import { ITable } from '@/src/types/table';
import Medallion from '@/src/components/ui/Medallion';

const SitRequestModal = () => {
  const { t } = useTranslation('language');
  const g = useGiftTheme();
  const sitRequest = useTableMessageStore((s) => s.sitRequest);
  const closeSitRequest = useTableMessageStore((s) => s.closeSitRequest);
  const [sending, setSending] = useState(false);

  const [showPlan, setShowPlan] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [tables, setTables] = useState<ITable[]>([]);
  const [ownTableId, setOwnTableId] = useState<string | null>(null);

  const fromTableId = sitRequest?.fromTableId;
  useEffect(() => setShowPlan(false), [fromTableId]);

  const togglePlan = async () => {
    if (showPlan) {
      setShowPlan(false);
      return;
    }

    setShowPlan(true);
    if (tables.length) return;

    setPlanLoading(true);
    try {
      const [res, payload] = await Promise.all([
        apolloClient.query({ query: GET_ACTIVE_TABLES, fetchPolicy: 'cache-first' }),
        getPayload(),
      ]);
      setTables(res?.data?.getActiveTables ?? []);
      setOwnTableId(payload?.table ?? null);
    } catch {
    } finally {
      setPlanLoading(false);
    }
  };

  if (!sitRequest) return null;

  const answer = async (accepted: boolean) => {
    if (sending) return;
    setSending(true);

    try {
      const res = await apolloClient.mutate({
        mutation: SEND_TABLE_REQUEST,
        variables: { input: { toTableId: sitRequest.fromTableId, accepted } },
      });

      if (res?.data?.sendTableRequest) {
        Toast.show(
          accepted
            ? t('mainPage.sit_reply_sent_yes', {
                table: sitRequest.fromTableName,
                defaultValue: `You accepted ${sitRequest.fromTableName}`,
              })
            : t('mainPage.sit_reply_sent_no', 'Declined'),
          { type: accepted ? 'success' : 'normal', placement: 'top', duration: 3000 },
        );
      }
    } catch (error: any) {
      Toast.show(error?.message, { type: 'danger', placement: 'top', duration: 4000 });
    } finally {
      setSending(false);
      closeSitRequest();
    }
  };

  return (
    <Portal>
      <Modal visible dismissable={false} contentContainerStyle={styles.wrap}>
        <View style={[styles.card, { backgroundColor: g.surface, borderColor: g.hairline }]}>
          <View style={[styles.body, sending && styles.bodySending]}>
            <Medallion glyph="account-multiple" size={96} solid />

            <View style={styles.fromRow}>
              <View style={[styles.fromLine, { backgroundColor: g.hairline }]} />
              <Text style={[styles.table, { color: g.text }]} numberOfLines={1}>
                {t('mainPage.toast_from_table', {
                  table: sitRequest.fromTableName,
                  defaultValue: `Table ${sitRequest.fromTableName}`,
                })}
              </Text>
              <View style={[styles.fromLine, { backgroundColor: g.hairline }]} />
            </View>

            <Text style={[styles.question, { color: g.text }]}>
              “{t('mainPage.sit_question', 'Shall we sit together?')}”
            </Text>

            <TouchableOpacity
              onPress={togglePlan}
              activeOpacity={0.7}
              style={[
                styles.planToggle,
                { borderColor: g.hairline, backgroundColor: g.raised },
                showPlan && styles.planToggleOpen,
              ]}
            >
              <Text style={[styles.planToggleText, { color: g.goldText }]}>
                {showPlan ? t('mainPage.Close', 'Close') : t('mainPage.sit_show_location', 'View location')}
              </Text>
              <Icon source={showPlan ? 'chevron-up' : 'chevron-down'} size={24} color={g.goldText} />
            </TouchableOpacity>

            {showPlan && (
              <View style={[styles.planPanel, { borderColor: g.hairline, backgroundColor: g.raised }]}>
                {planLoading ? (
                  <ActivityIndicator animating size="large" color={g.goldText} style={styles.planLoader} />
                ) : (
                  <TableFloorPlanPicker
                    tables={tables}
                    ownTableId={ownTableId}
                    highlightTableId={sitRequest.fromTableId}
                    senderGlyph="account-multiple"
                    compact
                  />
                )}
              </View>
            )}

            <View style={styles.actions}>
              <TouchableOpacity
                onPress={() => answer(false)}
                disabled={sending}
                activeOpacity={0.7}
                style={[styles.secondary, { borderColor: g.hairline }]}
              >
                <Icon source="close" size={22} color={g.goldText} />
                <Text style={[styles.secondaryText, { color: g.goldText }]}>{t('mainPage.sit_no', 'Not now')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => answer(true)}
                disabled={sending}
                activeOpacity={0.85}
                style={[styles.primary, { backgroundColor: g.gold }]}
              >
                <Icon source="check" size={24} color={g.onGold} />
                <Text style={[styles.primaryText, { color: g.onGold }]}>{t('mainPage.sit_yes', 'Yes')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Portal>
  );
};

export default SitRequestModal;

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  card: {
    width: Math.min(Dimensions.get('window').width * 0.66, 580),
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  goldRule: { height: 4, width: '100%' },
  body: { alignItems: 'center', paddingHorizontal: 34, paddingTop: 28, paddingBottom: 30 },
  bodySending: { opacity: 0.6 },
  fromRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 24, alignSelf: 'stretch' },
  fromLine: { flex: 1, height: 1 },
  table: { fontSize: 30, fontWeight: '800', flexShrink: 1 },
  question: { fontSize: 24, fontStyle: 'italic', marginTop: 16, lineHeight: 33, textAlign: 'center' },

  // Header and panel are two views, so they fake one control: when open, the
  // header drops its bottom radius and border to sit flush on the panel.
  planToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginTop: 22,
    paddingVertical: 14,
    paddingLeft: 20,
    paddingRight: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  planToggleOpen: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0 },
  planToggleText: { fontSize: 18, fontWeight: '700' },
  planPanel: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 14,
  },
  planLoader: { marginVertical: 40 },

  actions: { flexDirection: 'row', alignSelf: 'stretch', gap: 14, marginTop: 26 },
  primary: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 66,
    borderRadius: 16,
  },
  primaryText: { fontSize: 22, fontWeight: '800' },
  secondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 66,
    borderRadius: 16,
    borderWidth: 1,
  },
  secondaryText: { fontSize: 19, fontWeight: '700' },
});
