import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import de from './locales/de.json';
import en from './locales/en.json';
import fr from './locales/fr.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import mn from './locales/mn.json';
import ru from './locales/ru.json';
import sv from './locales/sv.json';
import uz from './locales/uz.json';
import zh from './locales/zh.json';

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
