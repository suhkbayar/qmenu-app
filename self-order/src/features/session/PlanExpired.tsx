import { useState } from 'react';
import { View } from 'react-native';
import { Button, useThemeColor } from 'heroui-native';
import { ShieldAlert, Store } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { SecretTap } from '@/src/features/kiosk/AdminExit';
import { Spinner } from '@/src/ui/Spinner';
import { Text } from '@/src/ui/Text';
import type { SessionBlock } from './useTableSession';

/**
 * Shown instead of the menu when the branch's QMenu plan has run out (server error PE0001), or the
 * branch is closed or inactive (BR0002, BR0004). The tablet stays on its table: a closed branch is
 * checked again now and then, and the menu comes back by itself.
 */
export const PlanExpired = ({ reason, onRetry }: { reason: SessionBlock; onRetry: () => Promise<unknown> }) => {
  const { t } = useTranslation('language');
  const [muted, accentForeground] = useThemeColor(['muted', 'accent-foreground']);
  const [checking, setChecking] = useState(false);

  const retry = async () => {
    setChecking(true);
    try {
      await onRetry();
    } catch {
      // Still expired: the query's onError keeps this screen up
    } finally {
      setChecking(false);
    }
  };

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background p-8">
      {/* The way into the admin dialog here, as there's no menu with its logo */}
      <SecretTap>
        {reason === 'closed' ? (
          <Store size={72} color={muted} strokeWidth={1.4} />
        ) : (
          <ShieldAlert size={72} color={muted} strokeWidth={1.4} />
        )}
      </SecretTap>
      <Text className="self-stretch text-center text-3xl font-bold">
        {t(reason === 'closed' ? 'setup.branchClosedTitle' : 'setup.planExpiredTitle')}
      </Text>
      <Text className="max-w-140 self-stretch text-center text-lg text-muted">
        {t(reason === 'closed' ? 'setup.branchClosedBody' : 'setup.planExpiredBody')}
      </Text>
      <Button size="lg" className="mt-2 rounded-2xl px-8" isDisabled={checking} onPress={retry}>
        {/* Spinners default to the brand yellow, which vanishes on the yellow button */}
        {checking && <Spinner color={accentForeground} />}
        <Button.Label numberOfLines={1} className="font-bold">{t('setup.checkAgain')}</Button.Label>
      </Button>
    </View>
  );
};
