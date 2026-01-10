import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './en';
import es from './es';
import fr from './fr';
import de from './de';
import tr from './tr';

// Language configuration
export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
] as const;

export type LanguageCode = typeof LANGUAGES[number]['code'];

// Create i18n instance
const i18n = new I18n({
  en,
  es,
  fr,
  de,
  tr,
});

// Set default locale based on device
i18n.defaultLocale = 'en';
i18n.enableFallback = true;

// Storage key for language preference
const LANGUAGE_STORAGE_KEY = '@app_language';

// Get stored language preference
export const getStoredLanguage = async (): Promise<LanguageCode | null> => {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && LANGUAGES.some(lang => lang.code === stored)) {
      return stored as LanguageCode;
    }
    return null;
  } catch {
    return null;
  }
};

// Store language preference
export const storeLanguage = async (languageCode: LanguageCode): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, languageCode);
  } catch (error) {
    console.error('Error storing language preference:', error);
  }
};

// Get device locale
export const getDeviceLocale = (): LanguageCode => {
  const deviceLocale = Localization.getLocales()[0]?.languageCode || 'en';
  // Check if device locale is supported
  if (LANGUAGES.some(lang => lang.code === deviceLocale)) {
    return deviceLocale as LanguageCode;
  }
  return 'en';
};

// Initialize language
export const initializeLanguage = async (): Promise<LanguageCode> => {
  const stored = await getStoredLanguage();
  const language = stored || getDeviceLocale();
  i18n.locale = language;
  return language;
};

// Set language
export const setLanguage = (languageCode: LanguageCode): void => {
  i18n.locale = languageCode;
};

export { i18n };
export default i18n;
