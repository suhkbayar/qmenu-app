import axios from 'axios';
import { getStorage, setStorage } from '@/cache';
import i18n from '@/utils/i18n';

// In-memory cache to avoid storage lookups
const memoryCache = new Map();

export async function fetchBatchTranslations(texts: string[]): Promise<Record<string, string>> {
  if (!texts || texts.length === 0) {
    return {};
  }

  // If language is Mongolian (source language), return original text
  if (i18n.language === 'mn') {
    return texts.reduce((acc, text) => ({ ...acc, [text]: text }), {});
  }

  const translations: Record<string, string> = {};
  const textsToTranslate: string[] = [];

  // Check memory cache first, then storage cache
  for (const text of texts) {
    if (!text) continue;

    const cacheKey = `${text}_${i18n.language}`;

    // Check memory cache first (faster)
    if (memoryCache.has(cacheKey)) {
      translations[text] = memoryCache.get(cacheKey);
      continue;
    }

    // Then check storage
    const cachedTranslation = await getStorage(cacheKey);
    if (cachedTranslation) {
      translations[text] = cachedTranslation;
      // Update memory cache
      memoryCache.set(cacheKey, cachedTranslation);
    } else {
      textsToTranslate.push(text);
    }
  }

  // If all translations were found in cache, return early
  if (textsToTranslate.length === 0) {
    return translations;
  }

  // Batch translate missing texts
  try {
    // Limit batch size to avoid extremely large requests
    const batchSize = 50;
    const batches = [];

    for (let i = 0; i < textsToTranslate.length; i += batchSize) {
      batches.push(textsToTranslate.slice(i, i + batchSize));
    }

    // Use your API key - consider moving this to environment variables
    const apiKey = 'AIzaSyDnEer55qhMmqzDVJFh8r35iGIJphY2Alk';

    // Process each batch
    for (const batch of batches) {
      const response = await axios.post(
        'https://translation.googleapis.com/language/translate/v2',
        { q: batch },
        {
          headers: { 'Content-Type': 'application/json' },
          params: {
            target: i18n.language,
            key: apiKey,
          },
        },
      );

      // Process the response
      response.data.data.translations.forEach((item: any, index: number) => {
        const originalText = batch[index];
        const translatedText = item.translatedText;
        const cacheKey = `${originalText}_${i18n.language}`;

        translations[originalText] = translatedText;

        // Update both memory and storage caches
        memoryCache.set(cacheKey, translatedText);
        setStorage(cacheKey, translatedText).catch((e) => console.error('Cache storage error:', e));
      });
    }

    return translations;
  } catch (error) {
    console.error('Batch translation error:', error);

    // On error, fallback to original texts
    textsToTranslate.forEach((text) => {
      translations[text] = text;
    });

    return translations;
  }
}
