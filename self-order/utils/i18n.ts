import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import de from '../providers/i18n/de.json';
import en from '../providers/i18n/en.json';
import fr from '../providers/i18n/fr.json';
import ja from '../providers/i18n/ja.json';
import ko from '../providers/i18n/ko.json';
import mn from '../providers/i18n/mn.json';
import ru from '../providers/i18n/ru.json';
import sv from '../providers/i18n/sv.json';
import uz from '../providers/i18n/uz.json';
import zh from '../providers/i18n/zh.json';

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources: {
    en: {
      language: en, // 'common' is our custom namespace
    },
    mn: {
      language: mn,
    },
    sv: {
      language: sv,
    },
    ru: {
      language: ru,
    },
    ko: {
      language: ko,
    },
    zh: {
      language: zh,
    },
    de: {
      language: de,
    },
    ja: {
      language: ja,
    },
    fr: {
      language: fr,
    },
    uz: {
      language: uz,
    },
  },
  lng: 'mn', // Initial language
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React already protects from XSS
  },
});

export default i18n;
