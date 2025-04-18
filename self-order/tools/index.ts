import { getStorage, setStorage } from '@/cache';
import i18n from '@/utils/i18n';
import axios from 'axios';

export async function fetchTranslations(text: string): Promise<string> {
  if (text === null) return '';
  if (i18n.language === 'mn') return text;
  const cacheKey = `${text}_${i18n.language}`;
  let translationCache = await getStorage(cacheKey);
  if (translationCache) {
    return translationCache;
  }

  const apiKey = 'AIzaSyDnEer55qhMmqzDVJFh8r35iGIJphY2Alk';
  if (!apiKey) {
    console.error('API key for Google Translate is not set.');
    return text;
  }

  try {
    const response = await axios.post(
      'https://translation.googleapis.com/language/translate/v2',
      { q: text },
      {
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': '0',
        },
        params: {
          target: i18n.language,
          key: apiKey, // Use API key from environment variable
        },
      },
    );

    const translatedText = response.data.data.translations[0].translatedText;
    setStorage(cacheKey, translatedText);
    return translatedText;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`Error during translation: ${error.message}`, error.response?.data);
    } else {
      console.error('Unexpected error during translation:', error);
    }
    return text; // Fallback to the original text in case of an error
  }
}
