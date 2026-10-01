import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import de from '@/src/providers/i18n/de.json';
import en from '@/src/providers/i18n/en.json';
import fr from '@/src/providers/i18n/fr.json';
import ja from '@/src/providers/i18n/ja.json';
import ko from '@/src/providers/i18n/ko.json';
import mn from '@/src/providers/i18n/mn.json';
import ru from '@/src/providers/i18n/ru.json';
import sv from '@/src/providers/i18n/sv.json';
import uz from '@/src/providers/i18n/uz.json';
import zh from '@/src/providers/i18n/zh.json';

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources: {
    en: { language: en },
    mn: { language: mn },
    sv: { language: sv },
    ru: { language: ru },
    ko: { language: ko },
    zh: { language: zh },
    de: { language: de },
    ja: { language: ja },
    fr: { language: fr },
    uz: { language: uz },
  },
  lng: 'mn',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
