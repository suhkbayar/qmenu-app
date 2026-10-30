import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Button, Dialog, useThemeColor } from 'heroui-native';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { MotionDialog } from '@/src/ui/MotionDialog';
import { Text } from '@/src/ui/Text';

const MAX_LENGTH = 100;
// Requests kitchens hear most; a tap adds one to the note, or takes it out again
const QUICK_NOTES = ['note_no_onion', 'note_no_spice', 'note_no_ice'];
// Android's own touch ripple, as on the category rail
const RIPPLE = { color: 'rgba(0,0,0,0.08)', foreground: true };

type Props = {
  /** The dish whose note is being written; null closes */
  target: { name: string; comment?: string } | null;
  onSave: (comment: string) => void;
  onClose: () => void;
};

/**
 * A note for the kitchen on one dish ("no onion"): quick chips plus free text. Small, so it stays
 * above the on-screen keyboard.
 */
export const NoteDialog = ({ target, onSave, onClose }: Props) => {
  // Keep the last dish on screen while the dialog animates closed; each open starts from its own note
  const [shown, setShown] = useState(target);
  useEffect(() => {
    if (target) setShown(target);
  }, [target]);
  const current = target ?? shown;

  return (
    <MotionDialog isOpen={!!target} onOpenChange={(open) => !open && onClose()} className="w-150 gap-5 p-7">
      {current && <NoteForm key={target ? 'open' : 'closing'} target={current} onSave={onSave} onClose={onClose} />}
    </MotionDialog>
  );
};

const NoteForm = ({
  target,
  onSave,
  onClose,
}: {
  target: { name: string; comment?: string };
  onSave: (comment: string) => void;
  onClose: () => void;
}) => {
  const { t } = useTranslation('language');
  const [foreground, muted, accent, accentForeground, surface, border] = useThemeColor([
    'foreground',
    'muted',
    'accent',
    'accent-foreground',
    'surface',
    'border',
  ]);
  const [text, setText] = useState(target.comment ?? '');

  const parts = text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  const toggle = (label: string) => {
    const next = parts.includes(label) ? parts.filter((part) => part !== label) : [...parts, label];
    setText(next.join(', ').slice(0, MAX_LENGTH));
  };

  return (
    <>
      <View className="flex-row items-start justify-between gap-4">
        <View className="min-w-0 flex-1 gap-0.5">
          <Dialog.Title className="text-2xl font-bold">{t('mainPage.note')}</Dialog.Title>
          <Text className="text-muted" numberOfLines={1}>
            {target.name}
          </Text>
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

      <View className="flex-row flex-wrap gap-2">
        {QUICK_NOTES.map((key) => {
          const label = t(`mainPage.${key}`);
          const active = parts.includes(label);
          return (
            // Selected = brand yellow, like the other choices in the app. A plain Pressable with every
            // colour through style, like the category rail: with heroui's PressableFeedback and a
            // toggled fill class, a selected chip came out plain yellow, its label gone
            <Pressable
              // Drawn anew when picked or not: a chip whose fill changed on screen lost its label
              key={`${key}-${active}`}
              onPress={() => toggle(label)}
              android_ripple={RIPPLE}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
              className="h-11 justify-center overflow-hidden rounded-full border px-4"
              style={{ backgroundColor: active ? accent : surface, borderColor: active ? accent : border }}
            >
              <Text
                className={active ? 'font-bold' : 'font-semibold'}
                style={{ color: active ? accentForeground : foreground }}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="gap-1.5">
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t('mainPage.note_placeholder')}
          placeholderTextColor={muted}
          maxLength={MAX_LENGTH}
          multiline
          autoFocus
          textAlignVertical="top"
          className="min-h-24 rounded-2xl border border-border bg-surface px-4 py-3 font-normal text-lg"
          // Typed text in the theme's colour through style; unset, Android draws it black
          style={{ color: foreground }}
        />
        <Text className="self-end text-xs text-muted">
          {text.length}/{MAX_LENGTH}
        </Text>
      </View>

      <Button size="lg" className="h-14 rounded-[18px]" onPress={() => onSave(text.trim())}>
        <Button.Label numberOfLines={1} className="text-lg font-bold">
          {t('mainPage.save')}
        </Button.Label>
      </Button>
    </>
  );
};
