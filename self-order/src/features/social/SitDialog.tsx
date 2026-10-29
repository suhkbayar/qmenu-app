import { useEffect, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import { Button, Dialog, Spinner, useThemeColor, useToast } from 'heroui-native';
import { Send, UsersRound, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useCSSVariable } from 'uniwind';
import { useHoldScreensaver } from '@/src/features/kiosk/screensaverHold';
import { SEND_TABLE_REQUEST } from '@/src/graphql/mutations/tableRequest';
import { GET_ACTIVE_TABLES } from '@/src/graphql/queries/tableMessage';
import { ITable } from '@/src/types/table';
import { Appear } from '@/src/ui/Appear';
import { Text } from '@/src/ui/Text';
import { useOpened } from '@/src/ui/useOpened';
import { useSocialStore } from './socialStore';
import { TableFloorPlan, useOwnTableId } from './TableFloorPlan';

/** Sit together: tap a table on the plan, send the invitation. They answer on their tablet. */
export const SitDialog = () => {
  const isOpen = useSocialStore((s) => s.composer === 'sit');
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
        {/* Not swipeable: dragging should not move the dialog. 760×660, smaller on a smaller screen */}
        <Dialog.Content
          animation={false}
          isSwipeable={false}
          className="gap-5 self-center p-7"
          style={{ width: Math.min(760, window.width - 48), height: Math.min(660, window.height - 40) }}
        >
          {session > 0 && <SitFlow key={session} onClose={close} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
};

const SitFlow = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation('language');
  const { toast } = useToast();
  const [foreground, accentForeground] = useThemeColor(['foreground', 'accent-foreground']);
  const color = useCSSVariable('--color-sit') as string;
  const [table, setTable] = useState<ITable | null>(null);
  // The tables from the last open at once, brought up to date from the server straight after
  const { data, loading } = useQuery(GET_ACTIVE_TABLES, { fetchPolicy: 'cache-and-network' });
  const tables: ITable[] = data?.getActiveTables ?? [];
  const ownTableId = useOwnTableId();
  // The plan (a button per table) is drawn once the dialog is open, so it doesn't slow the opening
  const opened = useOpened();
  const [sendRequest, { loading: sending }] = useMutation(SEND_TABLE_REQUEST);

  // Stays open on failure, so the guest can try again
  const send = async () => {
    if (!table) return;
    try {
      await sendRequest({ variables: { input: { toTableId: table.id } } });
      toast.show({ variant: 'success', label: t('mainPage.sit_sent', { table: table.name }) });
      onClose();
    } catch (error: any) {
      toast.show({ variant: 'danger', label: error?.message ?? String(error) });
    }
  };

  return (
    <>
      <View className="flex-row items-center gap-3.5">
        {/* White on the teal, as a fixed colour: theme text colours on fills were unreliable */}
        <View className="size-13 items-center justify-center rounded-2xl" style={{ backgroundColor: color }}>
          <UsersRound size={26} color="#FFFFFF" strokeWidth={2.2} />
        </View>
        <View className="min-w-0 flex-1 gap-0.5">
          <Dialog.Title className="text-2xl font-bold">{t('mainPage.sit_action')}</Dialog.Title>
          <Text className="text-sm text-muted">{t('mainPage.sit_picker_subtitle')}</Text>
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

      <View className="flex-1">
        {!opened ? null : loading && !tables.length ? (
          <Spinner className="mt-10 self-center" />
        ) : tables.some((tb) => tb.id !== ownTableId) ? (
          <Appear duration={150} style={{ flex: 1 }}>
            <TableFloorPlan
              tables={tables}
              ownTableId={ownTableId}
              markedId={table?.id}
              color={color}
              onSelect={setTable}
            />
          </Appear>
        ) : (
          <Text className="mt-10 text-center text-lg text-muted">{t('mainPage.no_other_tables')}</Text>
        )}
      </View>

      <View className="flex-row items-center gap-4">
        <View className="min-w-0 flex-1">
          {table ? (
            <Text className="text-[22px] font-bold" numberOfLines={1}>
              {t('mainPage.toast_from_table', { table: table.name })}
            </Text>
          ) : (
            <Text className="text-muted" numberOfLines={2}>
              {t('mainPage.sit_picker_title')}
            </Text>
          )}
        </View>
        <Button size="lg" className="h-15 rounded-[18px] px-7" isDisabled={!table || sending} onPress={send}>
          {sending ? <Spinner color={accentForeground} /> : <Send size={20} color={accentForeground} />}
          <Button.Label numberOfLines={1} className="text-lg font-bold">
            {t('mainPage.sit_send')}
          </Button.Label>
        </Button>
      </View>
    </>
  );
};
