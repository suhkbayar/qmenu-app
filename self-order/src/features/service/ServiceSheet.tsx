import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Dialog, Spinner, useThemeColor } from 'heroui-native';
import { router } from 'expo-router';
import { ArrowLeft, Bell, ChevronRight, History, QrCode, ReceiptText, Sparkles, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-native-qrcode-svg';
import { useSessionStore } from '@/src/features/session/sessionStore';
import { Text } from '@/src/ui/Text';
import { ServiceRequest, useServiceRequest } from './useServiceRequest';

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

const REQUESTS: { id: ServiceRequest; labelKey: string; Icon: typeof Bell }[] = [
  { id: 'waiter', labelKey: 'mainPage.call_waiter', Icon: Bell },
  { id: 'bill', labelKey: 'mainPage.request_bill', Icon: ReceiptText },
  { id: 'clean', labelKey: 'mainPage.table_clean', Icon: Sparkles },
];

// Android's own touch ripple: the tiles are plain views, so the sheet has less to set up as it opens
const RIPPLE = { color: 'rgba(0,0,0,0.08)', foreground: true };

/**
 * Call waiter, request the bill, ask for cleaning; or show the table's QR code for phone ordering,
 * or today's order history.
 */
export const ServiceSheet = ({ isOpen, onOpenChange }: Props) => {
  const { t } = useTranslation('language');
  const table = useSessionStore((s) => s.participant?.table);
  const { send, pending } = useServiceRequest();
  const [showQr, setShowQr] = useState(false);
  const [foreground, accentForeground, muted] = useThemeColor(['foreground', 'accent-foreground', 'muted']);

  useEffect(() => {
    if (!isOpen) setShowQr(false);
  }, [isOpen]);

  // Once staff have the request the sheet closes; the toast says it was sent
  const request = async (id: ServiceRequest) => {
    if (await send(id)) onOpenChange(false);
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content isSwipeable={false} className="w-215 gap-6 self-center p-8">
          <View className="flex-row items-start justify-between gap-4">
            <View className="gap-1">
              <Dialog.Title className="text-3xl font-bold tracking-tight">
                {showQr ? t('mainPage.qrCode') : t('mainPage.serviceTitle')}
              </Dialog.Title>
              <Text className="text-lg text-muted">{t('mainPage.serviceSubtitle', { table: table?.name })}</Text>
            </View>
            <Button
              isIconOnly
              variant="secondary"
              className="size-12 rounded-full"
              onPress={() => (showQr ? setShowQr(false) : onOpenChange(false))}
              accessibilityLabel={t('mainPage.close')}
            >
              {showQr ? <ArrowLeft size={22} color={foreground} /> : <X size={22} color={foreground} />}
            </Button>
          </View>

          {showQr ? (
            <View className="items-center gap-5 py-4">
              <QRCode value={`https://qr.qmenu.mn/qr/${table?.code}`} size={260} />
              <Text className="text-center text-base text-muted">
                {t('qr_info_text', 'QR кодыг уншуулснаар та захиалга хийх боломжтой')}
              </Text>
            </View>
          ) : (
            <>
              <View className="flex-row gap-4">
                {REQUESTS.map(({ id, labelKey, Icon }) => (
                  <Pressable
                    key={id}
                    onPress={() => request(id)}
                    disabled={!!pending}
                    android_ripple={RIPPLE}
                    className="h-44 flex-1 items-center justify-center gap-4 overflow-hidden rounded-3xl border border-border bg-surface px-3"
                    accessibilityRole="button"
                  >
                    <View className="size-19 items-center justify-center rounded-full bg-accent">
                      {pending === id ? <Spinner color={accentForeground} /> : <Icon size={32} color={accentForeground} />}
                    </View>
                    {/* Full tile width: Android cuts off a centred label sized to its own text */}
                    <Text className="self-stretch text-center text-xl font-bold" numberOfLines={2}>
                      {t(labelKey)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                onPress={() => setShowQr(true)}
                android_ripple={RIPPLE}
                className="h-16 flex-row items-center gap-3.5 overflow-hidden rounded-[18px] bg-background px-5"
                accessibilityRole="button"
              >
                <QrCode size={24} color={foreground} />
                <Text className="flex-1 font-semibold" numberOfLines={1}>
                  {t('mainPage.phoneOrder')}
                </Text>
                <ChevronRight size={22} color={muted} />
              </Pressable>
              {/* Every order today at this table, for when a guest says they ordered but can't find it.
                  Here because Service is always in the top bar; the order bar isn't once all is done. */}
              <Pressable
                onPress={() => {
                  onOpenChange(false);
                  router.push('/history');
                }}
                android_ripple={RIPPLE}
                className="-mt-3 h-16 flex-row items-center gap-3.5 overflow-hidden rounded-[18px] bg-background px-5"
                accessibilityRole="button"
              >
                <History size={24} color={foreground} />
                <Text className="flex-1 font-semibold" numberOfLines={1}>
                  {t('mainPage.orderHistory')}
                </Text>
                <ChevronRight size={22} color={muted} />
              </Pressable>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
};
