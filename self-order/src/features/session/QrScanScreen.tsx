import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BarcodeScanningResult, CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { Button, useThemeColor, useToast } from 'heroui-native';
import { ArrowLeft, CameraOff, SwitchCamera } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { LoadingScreen } from '@/src/ui/LoadingScreen';
import { LogoLoader } from '@/src/ui/LogoLoader';
import { Text } from '@/src/ui/Text';
import { useTableLogin } from './useTableLogin';

// After a failed scan the same QR is usually still in view; wait before trying again
const RETRY_AFTER_MS = 3000;

/** Logs in by scanning the table's QR sticker. The code is the last part of the QR's link. */
export const QrScanScreen = () => {
  const { t } = useTranslation('language');
  const { toast } = useToast();
  const [foreground, muted] = useThemeColor(['foreground', 'muted']);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const { login, loading } = useTableLogin();
  const scanning = useRef(false);

  useEffect(() => {
    if (permission?.status === 'undetermined') requestPermission();
  }, [permission?.status]);

  const onScan = async ({ data }: BarcodeScanningResult) => {
    const code = data?.split('/').pop();
    if (scanning.current || !code) return;
    scanning.current = true;
    try {
      await login(code);
    } catch (err) {
      toast.show({ variant: 'warning', label: (err as Error).message });
      setTimeout(() => (scanning.current = false), RETRY_AFTER_MS);
    }
  };

  if (!permission) return <LoadingScreen />;

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center gap-5 bg-background p-8">
        <CameraOff size={64} color={muted} strokeWidth={1.5} />
        <Text className="max-w-110 self-stretch text-center text-lg">{t('setup.cameraPermission')}</Text>
        <Button size="lg" className="rounded-2xl px-6" onPress={requestPermission}>
          <Button.Label numberOfLines={1} className="font-bold">{t('setup.allowCamera')}</Button.Label>
        </Button>
        <Button variant="ghost" onPress={() => router.back()}>
          <ArrowLeft size={20} color={foreground} />
          <Button.Label numberOfLines={1}>{t('mainPage.GoBack')}</Button.Label>
        </Button>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={StyleSheet.absoluteFill}
        facing={facing}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={onScan}
      />

      <View pointerEvents="none" style={StyleSheet.absoluteFill} className="items-center justify-center gap-6">
        <View className="size-70 rounded-3xl border-4 border-accent" />
        <View className="rounded-full px-5 py-2.5" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <Text className="text-lg font-semibold text-white">{t('setup.pointAtQr')}</Text>
        </View>
      </View>

      <View className="absolute left-6 right-6 top-6 flex-row justify-between">
        <Button variant="secondary" className="h-13 rounded-2xl px-4" onPress={() => router.back()}>
          <ArrowLeft size={22} color={foreground} />
          <Button.Label numberOfLines={1} className="font-semibold">{t('mainPage.GoBack')}</Button.Label>
        </Button>
        <Button
          variant="secondary"
          className="h-13 rounded-2xl px-4"
          onPress={() => setFacing((current) => (current === 'back' ? 'front' : 'back'))}
        >
          <SwitchCamera size={22} color={foreground} />
          <Button.Label numberOfLines={1} className="font-semibold">{t('setup.flipCamera')}</Button.Label>
        </Button>
      </View>

      {loading && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} className="items-center justify-center">
          <LogoLoader />
        </View>
      )}
    </View>
  );
};
