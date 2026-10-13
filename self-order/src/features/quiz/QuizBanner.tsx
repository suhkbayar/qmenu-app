import { View } from 'react-native';
import { Button } from 'heroui-native';
import { useTranslation } from 'react-i18next';
import { Image } from '@/src/ui/Image';
import { Text } from '@/src/ui/Text';
import { useQuizStore } from './quizStore';

// A dark promo card in both themes; its colours are fixed rather than theme tokens
const CARD = '#16181C';
const TITLE = '#FFFFFF';
const BODY = '#C9CDD3';

/** The Mbank quiz, as a banner at the top of every branch's menu. */
export const QuizBanner = () => {
  const { t } = useTranslation('language');
  const openQuiz = useQuizStore((s) => s.openQuiz);

  return (
    <View className="flex-row items-center gap-4 rounded-[20px] py-4 pl-4.5 pr-4" style={{ backgroundColor: CARD }}>
      <View className="size-12 items-center justify-center rounded-2xl" style={{ backgroundColor: TITLE }}>
        <Image source={require('@/assets/icon/mbank.png')} className="size-8" contentFit="contain" />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-lg font-bold" style={{ color: TITLE }}>
          Mbank Quiz
        </Text>
        <Text style={{ color: BODY }} numberOfLines={1}>
          {t('mainPage.quizBody')}
        </Text>
      </View>
      <Button className="h-12 rounded-2xl px-5.5" onPress={openQuiz}>
        <Button.Label numberOfLines={1} className="font-bold">
          {t('mainPage.quizPlay')}
        </Button.Label>
      </Button>
    </View>
  );
};
