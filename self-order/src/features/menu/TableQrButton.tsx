import { useState } from 'react';
import { View } from 'react-native';
import { Button, Dialog, useThemeColor } from 'heroui-native';
import { QrCode, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-native-qrcode-svg';
import { useHoldScreensaver } from '@/src/features/kiosk/screensaverHold';
import { useSessionStore } from '@/src/features/session/sessionStore';
import { ActionButton } from '@/src/ui/ActionButton';
import { Text } from '@/src/ui/Text';

/** By the table's name in the top bar: the table's QR code, for guests who'd rather order from their phone. */
export const TableQrButton = () => {
  const { t } = useTranslation('language');
  const foreground = useThemeColor('foreground');
  const table = useSessionStore((s) => s.participant?.table);
  const [open, setOpen] = useState(false);
  // Scanning it with a phone means no touches here
  useHoldScreensaver(open);

  if (!table?.code) return null;

  return (
    <>
      <ActionButton
        iconOnly
        label={t('mainPage.qrCode')}
        icon={<QrCode size={24} color={foreground} />}
        onPress={() => setOpen(true)}
      />
      <Dialog isOpen={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content isSwipeable={false} className="w-110 gap-5 self-center p-7">
            <View className="flex-row items-start justify-between gap-4">
              <View className="gap-1">
                <Dialog.Title className="text-3xl font-bold tracking-tight">{t('mainPage.qrCode')}</Dialog.Title>
                <Text className="text-lg text-muted">{t('mainPage.toast_from_table', { table: table.name })}</Text>
              </View>
              <Button
                isIconOnly
                variant="secondary"
                className="size-12 rounded-full"
                onPress={() => setOpen(false)}
                accessibilityLabel={t('mainPage.close')}
              >
                <X size={22} color={foreground} />
              </Button>
            </View>
            {/* QR codes need a white background to scan, also in dark mode */}
            <View className="self-center rounded-3xl bg-white p-4">
              <QRCode value={`https://qr.qmenu.mn/qr/${table.code}`} size={260} />
            </View>
            {/* Full width: Android cuts off a centred label sized to its own text */}
            <Text className="self-stretch text-center text-lg text-muted">{t('mainPage.qrInfo')}</Text>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </>
  );
};
