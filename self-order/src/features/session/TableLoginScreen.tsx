import { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Dialog, PressableFeedback, Spinner, cn, useThemeColor, useToast } from 'heroui-native';
import { ArrowLeft, Moon, Plus, RefreshCw, ScanQrCode, Sun } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { SecretTap } from '@/src/features/kiosk/AdminExit';
import { NetworkIndicator } from '@/src/features/kiosk/NetworkIndicator';
import { VersionBadge } from '@/src/features/kiosk/VersionBadge';
import { checkConnection, useNoInternet } from '@/src/lib/network';
import { ICustomerTable } from '@/src/types';
import { Image } from '@/src/ui/Image';
import { Text } from '@/src/ui/Text';
import { useThemeStore } from '@/src/ui/themeStore';
import { useSessionStore } from './sessionStore';
import { useTableLogin } from './useTableLogin';

/**
 * Staff setup: pick one of the tables this tablet has used before, or add one by its code or QR.
 * Pressing and holding a saved table removes it from the list.
 */
export const TableLoginScreen = () => {
  const { t } = useTranslation('language');
  const foreground = useThemeColor('foreground');
  const { isDark, toggleTheme } = useThemeStore();
  const tables = useSessionStore((s) => s.tables);
  const [adding, setAdding] = useState(false);
  const showForm = adding || tables.length === 0;
  const offline = useNoInternet();

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-6 pt-5">
        {/* 10 quick taps open the admin dialog, e.g. to fix Wi-Fi before a table is set up */}
        <SecretTap>
          <Image source={require('@/assets/images/icon.png')} className="size-13 rounded-2xl" />
        </SecretTap>
        {showForm && tables.length > 0 && (
          <Button variant="secondary" className="h-13 rounded-2xl px-4" onPress={() => setAdding(false)}>
            <ArrowLeft size={22} color={foreground} />
            <Button.Label numberOfLines={1} className="font-semibold">{t('mainPage.GoBack')}</Button.Label>
          </Button>
        )}
        <View className="flex-1" />
        {offline && <CheckConnectionButton />}
        <NetworkIndicator />
        <Button
          isIconOnly
          variant="outline"
          className="size-13 rounded-2xl"
          onPress={toggleTheme}
          accessibilityLabel={t(isDark ? 'setup.lightMode' : 'setup.darkMode')}
        >
          {isDark ? <Sun size={24} color={foreground} /> : <Moon size={24} color={foreground} />}
        </Button>
      </View>

      <KeyboardAvoidingView behavior="height" style={{ flex: 1 }}>
        <Pressable className="flex-1 items-center justify-center" onPress={Keyboard.dismiss} accessible={false}>
          {showForm ? <CodeForm /> : <SavedTables tables={tables} onAdd={() => setAdding(true)} />}
        </Pressable>
      </KeyboardAvoidingView>

      <View className="pb-4">
        <VersionBadge />
      </View>
    </View>
  );
};

/** While offline: tries the QMenu server now, rather than at the next automatic check. */
const CheckConnectionButton = () => {
  const { t } = useTranslation('language');
  const { toast } = useToast();
  const foreground = useThemeColor('foreground');
  const [checking, setChecking] = useState(false);

  const check = async () => {
    setChecking(true);
    const online = await checkConnection();
    setChecking(false);
    if (!online) toast.show({ variant: 'warning', label: t('mainPage.no_internet') });
  };

  return (
    <Button variant="secondary" className="h-13 rounded-2xl px-4" isDisabled={checking} onPress={check}>
      {checking ? <Spinner size="sm" /> : <RefreshCw size={20} color={foreground} />}
      <Button.Label numberOfLines={1} className="font-semibold">{t('setup.checkAgain')}</Button.Label>
    </Button>
  );
};

const CodeForm = () => {
  const { t } = useTranslation('language');
  const [foreground, muted] = useThemeColor(['foreground', 'muted']);
  const { login, loading } = useTableLogin();
  const offline = useNoInternet();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Scanning only leads to a login, which needs the internet (and offline the camera once went black)
  const scan = () => (offline ? setError(t('mainPage.no_internet')) : router.push('/setup/scan'));

  const submit = async () => {
    const trimmed = code.trim();
    if (!trimmed) return setError(t('setup.tableCodeRequired'));
    try {
      await login(trimmed);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <View className="w-110 items-center gap-6">
      <View className="items-center gap-1.5">
        <Text className="text-3xl font-bold">{t('setup.tableCode')}</Text>
        <Text className="text-center text-muted">{t('setup.enterCode')}</Text>
      </View>

      <View className="w-full gap-2">
        <View
          className={cn(
            'h-15 flex-row items-center gap-2 rounded-2xl border bg-surface pl-4 pr-1.5',
            error ? 'border-danger' : 'border-border',
          )}
        >
          <TextInput
            value={code}
            onChangeText={(value) => {
              setCode(value);
              setError(null);
            }}
            onSubmitEditing={submit}
            placeholder={t('setup.tableCode')}
            placeholderTextColor={muted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            className="flex-1 font-normal text-lg text-foreground"
          />
          <Button variant="secondary" className="h-12 rounded-xl px-3.5" onPress={scan}>
            <ScanQrCode size={20} color={foreground} />
            <Button.Label numberOfLines={1} className="font-semibold">{t('setup.scanQr')}</Button.Label>
          </Button>
        </View>
        {!!error && <Text className="text-sm font-medium text-danger">{error}</Text>}
      </View>

      <Button size="lg" className="h-15 w-full rounded-2xl" isDisabled={loading} onPress={submit}>
        {loading && <Spinner />}
        <Button.Label numberOfLines={1} className="text-lg font-bold">{t('setup.continue')}</Button.Label>
      </Button>
    </View>
  );
};

const SavedTables = ({ tables, onAdd }: { tables: ICustomerTable[]; onAdd: () => void }) => {
  const { t } = useTranslation('language');
  const { toast } = useToast();
  const accentForeground = useThemeColor('accent-foreground');
  const deleteTable = useSessionStore((s) => s.deleteTable);
  const { login } = useTableLogin();
  // Adding a table needs the server (and its camera screen once went black offline)
  const offline = useNoInternet();
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [removing, setRemoving] = useState<ICustomerTable | null>(null);

  const open = async (table: ICustomerTable) => {
    if (pendingCode) return;
    setPendingCode(table.code);
    try {
      await login(table.code);
    } catch (err) {
      setPendingCode(null);
      toast.show({ variant: 'warning', label: (err as Error).message });
    }
  };

  return (
    <View className="items-center gap-6 self-stretch">
      <View className="items-center gap-1.5">
        <Text className="text-3xl font-bold">{t('setup.chooseTable')}</Text>
        <Text className="text-muted">{t('setup.holdToRemove')}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="grow-0 self-stretch"
        contentContainerClassName="grow justify-center gap-4 px-6 py-2"
      >
        {tables.map((table) => (
          <PressableFeedback
            key={table.code}
            onPress={() => open(table)}
            onLongPress={() => setRemoving(table)}
            isDisabled={!!pendingCode}
            className="h-56 w-48 items-center overflow-hidden rounded-3xl border border-border bg-surface p-3 shadow-sm"
            accessibilityRole="button"
          >
            <Image
              source={{ uri: table.branchLogo }}
              className="h-28 w-full rounded-2xl bg-surface-secondary"
              contentFit="contain"
            />
            <Text className="mt-3 self-stretch text-center font-semibold" numberOfLines={2}>
              {table.branchName}
            </Text>
            <Text className="mt-0.5 text-muted">{table.tableName}</Text>
            {pendingCode === table.code && (
              <View className="absolute inset-0 items-center justify-center bg-surface opacity-90">
                <Spinner size="lg" />
              </View>
            )}
          </PressableFeedback>
        ))}

        <PressableFeedback
          onPress={onAdd}
          isDisabled={!!pendingCode || offline}
          className={cn(
            'h-56 w-48 items-center justify-center gap-2 rounded-3xl bg-accent',
            offline && 'opacity-40',
          )}
          accessibilityRole="button"
        >
          <Plus size={48} color={accentForeground} />
          <Text className="font-semibold text-accent-foreground">{t('setup.addTable')}</Text>
        </PressableFeedback>
      </ScrollView>

      <Dialog isOpen={!!removing} onOpenChange={(isOpen) => !isOpen && setRemoving(null)}>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content isSwipeable={false} className="w-110 gap-4 self-center p-7">
            <Dialog.Title className="text-2xl">{t('setup.removeTitle')}</Dialog.Title>
            <Dialog.Description className="text-base">
              {t('setup.removeBody', { table: removing?.tableName })}
            </Dialog.Description>
            <View className="mt-2 flex-row gap-3">
              <Button size="lg" variant="secondary" className="flex-1 rounded-2xl" onPress={() => setRemoving(null)}>
                <Button.Label numberOfLines={1}>{t('setup.cancel')}</Button.Label>
              </Button>
              <Button
                size="lg"
                variant="danger"
                className="flex-1 rounded-2xl"
                onPress={() => {
                  if (removing) deleteTable(removing.code);
                  setRemoving(null);
                }}
              >
                <Button.Label numberOfLines={1} className="font-bold">{t('setup.remove')}</Button.Label>
              </Button>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </View>
  );
};
