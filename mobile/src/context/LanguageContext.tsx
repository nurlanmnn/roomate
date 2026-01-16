import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { i18n, initializeLanguage, setLanguage, storeLanguage, LANGUAGES } from '../locales';
import type { LanguageCode } from '../locales';

interface LanguageContextType {
  language: LanguageCode;
  changeLanguage: (code: LanguageCode) => Promise<void>;
  t: typeof i18n.t;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>('en');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const initialLanguage = await initializeLanguage();
        setLanguageState(initialLanguage);
      } catch (error) {
        console.error('Error initializing language:', error);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const changeLanguage = useCallback(async (code: LanguageCode) => {
    setLanguage(code);
    setLanguageState(code);
    await storeLanguage(code);
  }, []);

  // Memoize the translation function bound to current locale
  const t = useCallback((scope: string, options?: object) => {
    return i18n.t(scope, options);
  }, [language]);

  const value: LanguageContextType = {
    language,
    changeLanguage,
    t,
    isLoading,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Re-export for convenience
export { LANGUAGES };
export type { LanguageCode };
