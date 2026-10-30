import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useLazyQuery, useMutation } from '@apollo/client';
import { Button, Dialog, cn, useThemeColor } from 'heroui-native';
import * as Haptics from 'expo-haptics';
import { Check, ChevronUp, Gift, MapPin, UsersRound, Wine, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useCSSVariable } from 'uniwind';
import { TABLE_MESSAGE_STICKERS } from '@/src/constants';
import { SEND_TABLE_MESSAGE } from '@/src/graphql/mutations/tableMessage';
import { SEND_TABLE_REQUEST } from '@/src/graphql/mutations/tableRequest';
import { GET_ACTIVE_TABLES } from '@/src/graphql/queries/tableMessage';
import { ITable } from '@/src/types/table';
import { Appear } from '@/src/ui/Appear';
import { MotionDialog } from '@/src/ui/MotionDialog';
import { Spinner } from '@/src/ui/Spinner';
import { Text } from '@/src/ui/Text';
import { useNotify } from '@/src/ui/useNotify';
import { IncomingMessage, useSocialStore } from './socialStore';
import { Sticker } from './Sticker';
import { TableFloorPlan, useOwnTableId } from './TableFloorPlan';

const REPLIES = TABLE_MESSAGE_STICKERS.filter((s) => s.tone === 'REPLY');
// Light icons and text on the red and teal fills, as fixed colours: theme text colours on fills were unreliable
const ON_COLOR = '#FFFFFF';
// An answer nobody closes (the guests may have left) goes away by itself after this long
const ANSWER_MS = 60 * 1000;

// An answer to something we sent: they accepted or declined our invitation, or replied to our gift
const isAnswer = (message: IncomingMessage) =>
  message.kind === 'sit-reply' || (message.kind === 'message' && !!message.isReply);

/**
 * What other tables sent, one at a time, each as a card so it's noticed: a gift, an invitation (which
 * has to be answered), or an answer to ours.
 */
export const IncomingMessages = () => {
  const message = useSocialStore((s) => s.inbox[0]);
  const dismiss = useSocialStore((s) => s.dismiss);
  // The last one stays on the card while it fades out
  const last = useRef(message);
  if (message) last.current = message;
  const shown = message ?? last.current;
  const answer = !!shown && isAnswer(shown);
  const mustAnswer = message?.kind === 'sit-request';

  return (
    // An invitation can't be closed from outside: it has to be answered
    <MotionDialog
      isOpen={!!message}
      onOpenChange={(open) => !open && message && !mustAnswer && dismiss(message.key)}
      closeOnBackdrop={!mustAnswer}
      className={cn('overflow-hidden p-0', answer ? 'w-130' : 'w-150')}
    >
      {shown &&
        (answer ? (
          <AnswerCard key={shown.key} message={shown} onDone={() => dismiss(shown.key)} />
        ) : (
          <MessageCard key={shown.key} message={shown} onDone={() => dismiss(shown.key)} />
        ))}
    </MotionDialog>
  );
};

/** A gift, a message, or an invitation to sit together. */
const MessageCard = ({ message, onDone }: { message: IncomingMessage; onDone: () => void }) => {
  const { t } = useTranslation('language');
  const notify = useNotify();
  const [muted, accentForeground] = useThemeColor(['muted', 'accent-foreground']);
  const [gift, giftText, sit, sitText] = useCSSVariable([
    '--color-gift',
    '--color-gift-text',
    '--color-sit',
    '--color-sit-text',
  ]) as string[];

  const { kind, fromTableId, fromTableName, anonymous } = message;
  const invite = kind === 'sit-request';
  const sticker = TABLE_MESSAGE_STICKERS.find((s) => s.id === message.stickerId);
  const canReply = (kind === 'gift' || kind === 'message') && !!fromTableId && !message.isReply;
  // An anonymous sender's location is exactly what the plan would give away
  const canLocate = !!fromTableId && !anonymous;

  // An invitation shows where they sit straight away; a gift on request
  const [showPlan, setShowPlan] = useState(invite && canLocate);
  const ownTableId = useOwnTableId();
  const [loadTables, { data: tablesData, loading: tablesLoading }] = useLazyQuery(GET_ACTIVE_TABLES, {
    fetchPolicy: 'cache-first',
  });
  const [answerRequest, { loading: answering }] = useMutation(SEND_TABLE_REQUEST);
  const [sendMessage, { loading: replying }] = useMutation(SEND_TABLE_MESSAGE);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, []);
  useEffect(() => {
    if (showPlan) loadTables();
  }, [showPlan]);

  const fail = (error: any) => notify('danger', error?.message ?? String(error));

  // One tap sends the reply sticker straight back
  const reply = async (stickerId: string) => {
    if (!fromTableId) return;
    try {
      await sendMessage({
        variables: { input: { toTableId: fromTableId, stickerId, giftId: message.giftId ?? undefined } },
      });
      notify('success', t('mainPage.message_sent', { table: fromTableName }));
      onDone();
    } catch (error) {
      fail(error);
    }
  };

  const answer = async (accepted: boolean) => {
    if (!fromTableId) return onDone();
    try {
      await answerRequest({ variables: { input: { toTableId: fromTableId, accepted } } });
      notify(
        accepted ? 'success' : 'default',
        accepted ? t('mainPage.sit_reply_sent_yes', { table: fromTableName }) : t('mainPage.sit_reply_sent_no'),
      );
    } catch (error) {
      fail(error);
    }
    onDone();
  };

  const from = anonymous
    ? t('mainPage.toast_from_anonymous')
    : t('mainPage.toast_from_table', { table: fromTableName });
  const eyebrow = invite
    ? t('mainPage.sit_invite_eyebrow')
    : kind === 'gift'
      ? t('mainPage.gift_toast_eyebrow')
      : t('mainPage.eyebrow_message');

  return (
    <View>
      <View className={cn('items-center gap-2 px-7 pb-6 pt-8', invite ? 'bg-sit-soft' : 'bg-gift-soft')}>
        {!invite && (
          <Button
            isIconOnly
            variant="secondary"
            className="absolute right-4 top-4 size-12 rounded-full bg-surface"
            onPress={onDone}
            accessibilityLabel={t('mainPage.close')}
          >
            <X size={22} color={muted} />
          </Button>
        )}
        <Appear
          from="zoom"
          duration={380}
          className="mb-1.5 size-28 items-center justify-center rounded-full bg-surface"
          style={{
            elevation: 8,
            shadowColor: invite ? sit : gift,
            shadowOpacity: 0.25,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 8 },
          }}
        >
          {invite ? (
            <UsersRound size={48} color={sitText} strokeWidth={2} />
          ) : (
            <Sticker id={sticker?.id ?? (kind === 'gift' ? 'GIFT' : 'LETTER')} size={76} plays={2} />
          )}
          {kind === 'gift' && (
            <View className="absolute -bottom-1 -right-1 size-11 items-center justify-center rounded-[14px] border-[3px] border-gift-soft bg-gift">
              <Gift size={19} color={ON_COLOR} strokeWidth={2.3} />
            </View>
          )}
        </Appear>
        <Text className="self-stretch text-center font-bold" style={{ color: invite ? sitText : giftText }}>
          {eyebrow}
        </Text>
        <Dialog.Title className="self-stretch text-center text-[34px] font-bold tracking-tight" numberOfLines={1}>
          {from}
        </Dialog.Title>
        {invite && (
          <Text className="self-stretch text-center text-xl font-semibold">“{t('mainPage.sit_question')}”</Text>
        )}
      </View>

      <View className="gap-4 px-7 pb-7 pt-6">
        {!invite && !!sticker && (
          <Text className="text-center text-2xl font-bold">“{t(`mainPage.${sticker.labelKey}`)}”</Text>
        )}
        {!!message.itemsSummary && (
          <View className="flex-row items-center gap-3.5 rounded-[18px] bg-background px-4 py-3.5">
            <View className="size-11 items-center justify-center rounded-[14px] bg-surface">
              <Wine size={21} color={giftText} />
            </View>
            <View className="min-w-0 flex-1 gap-0.5">
              <Text className="text-lg font-bold" numberOfLines={2}>
                {message.itemsSummary}
              </Text>
              <Text className="text-sm text-muted">{t('mainPage.gift_coming')}</Text>
            </View>
          </View>
        )}

        {showPlan && canLocate && (
          <View className="gap-2.5">
            {invite && (
              <View className="flex-row items-center gap-2">
                <MapPin size={18} color={sitText} />
                <Text className="text-sm font-semibold">{t('mainPage.sender_here')}</Text>
              </View>
            )}
            {tablesLoading ? (
              <Spinner className="my-8 self-center" />
            ) : (
              <TableFloorPlan
                compact
                pulse
                tables={(tablesData?.getActiveTables ?? []) as ITable[]}
                ownTableId={ownTableId}
                markedId={fromTableId}
                color={invite ? sit : gift}
              />
            )}
          </View>
        )}

        {invite ? (
          <View className="flex-row gap-3 pt-1.5">
            <Button
              size="lg"
              variant="outline"
              className="h-15 flex-1 rounded-[18px]"
              isDisabled={answering}
              onPress={() => answer(false)}
            >
              <Button.Label numberOfLines={1} className="font-bold">
                {t('mainPage.sit_no')}
              </Button.Label>
            </Button>
            <Button size="lg" className="h-15 flex-1 rounded-[18px]" isDisabled={answering} onPress={() => answer(true)}>
              {answering ? <Spinner color={accentForeground} /> : <Check size={20} color={accentForeground} strokeWidth={2.6} />}
              <Button.Label numberOfLines={1} className="font-bold">
                {t('mainPage.sit_yes')}
              </Button.Label>
            </Button>
          </View>
        ) : (
          <>
            {canReply && (
              <View className="gap-2.5 pt-1">
                <Text className="text-sm font-semibold text-muted">{t('mainPage.reply_action')}</Text>
                <View className="flex-row gap-3">
                  {REPLIES.map((s) => (
                    <Button
                      key={s.id}
                      size="lg"
                      variant="outline"
                      className="h-15 flex-1 rounded-[18px]"
                      isDisabled={replying}
                      onPress={() => reply(s.id)}
                    >
                      <Sticker id={s.id} size={30} />
                      <Button.Label numberOfLines={1} className="font-bold">
                        {t(`mainPage.${s.labelKey}`)}
                      </Button.Label>
                    </Button>
                  ))}
                </View>
              </View>
            )}
            {canLocate && (
              <Button variant="ghost" className="self-center" onPress={() => setShowPlan(!showPlan)}>
                {showPlan ? <ChevronUp size={19} color={muted} /> : <MapPin size={19} color={muted} />}
                <Button.Label numberOfLines={1} className="font-semibold text-muted">
                  {showPlan ? t('mainPage.hide_sender_location') : t('mainPage.show_sender_location')}
                </Button.Label>
              </Button>
            )}
          </>
        )}
      </View>
    </View>
  );
};

/**
 * An answer to something we sent: they accepted or declined our invitation, or replied to our gift.
 * A big card so it's noticed; it closes itself after a minute in case the guests have left.
 */
const AnswerCard = ({ message, onDone }: { message: IncomingMessage; onDone: () => void }) => {
  const { t } = useTranslation('language');
  const muted = useThemeColor('muted');
  const [gift, giftText, sit, sitText] = useCSSVariable([
    '--color-gift',
    '--color-gift-text',
    '--color-sit',
    '--color-sit-text',
  ]) as string[];
  const sitReply = message.kind === 'sit-reply';
  const accepted = sitReply && !!message.accepted;
  const sticker = TABLE_MESSAGE_STICKERS.find((s) => s.id === message.stickerId);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const timer = setTimeout(onDone, ANSWER_MS);
    return () => clearTimeout(timer);
  }, []);

  // Accepted: teal. Declined: quiet grey. A reply to our gift: the gift red.
  const tone = sitReply ? (accepted ? sitText : muted) : giftText;
  const text = sitReply
    ? accepted
      ? t('mainPage.sit_accepted')
      : t('mainPage.sit_declined')
    : sticker
      ? `“${t(`mainPage.${sticker.labelKey}`)}”`
      : '';

  return (
    <View>
      <View
        className={cn(
          'items-center gap-2 px-7 pb-6 pt-8',
          sitReply ? (accepted ? 'bg-sit-soft' : 'bg-surface-secondary') : 'bg-gift-soft',
        )}
      >
        <Appear
          from="zoom"
          duration={380}
          className="mb-1.5 size-28 items-center justify-center rounded-full bg-surface"
          style={{
            elevation: 8,
            shadowColor: sitReply ? sit : gift,
            shadowOpacity: 0.25,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 8 },
          }}
        >
          {sitReply ? (
            accepted ? (
              <Check size={56} color={sitText} strokeWidth={2.6} />
            ) : (
              <UsersRound size={48} color={muted} strokeWidth={2} />
            )
          ) : (
            <Sticker id={sticker?.id ?? 'LETTER'} size={76} plays={2} />
          )}
        </Appear>
        <Text className="self-stretch text-center font-bold" style={{ color: tone }}>
          {sitReply ? t('mainPage.sit_invite_eyebrow') : t('mainPage.eyebrow_message')}
        </Text>
        <Dialog.Title className="self-stretch text-center text-[34px] font-bold tracking-tight" numberOfLines={1}>
          {t('mainPage.toast_from_table', { table: message.fromTableName })}
        </Dialog.Title>
      </View>

      <View className="gap-6 px-7 pb-7 pt-6">
        {!!text && (
          <Text className="text-center text-3xl font-bold" style={accepted ? { color: sitText } : undefined}>
            {text}
          </Text>
        )}
        <Button size="lg" className="h-15 rounded-[18px]" onPress={onDone}>
          <Button.Label numberOfLines={1} className="text-lg font-bold">
            {t('mainPage.close')}
          </Button.Label>
        </Button>
      </View>
    </View>
  );
};
