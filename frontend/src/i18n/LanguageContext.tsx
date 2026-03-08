import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, Language, getTranslation, getGroupTranslation } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations.hu) => string;
  tGroup: (groupId: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_KEY = 'app_language';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('hu');

  useEffect(() => {
    // Load saved language
    AsyncStorage.getItem(LANGUAGE_KEY).then((savedLang) => {
      if (savedLang && (savedLang === 'hu' || savedLang === 'en' || savedLang === 'el')) {
        setLanguageState(savedLang as Language);
      }
    });
  }, []);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  };

  const t = (key: keyof typeof translations.hu): string => {
    return getTranslation(language, key);
  };

  const tGroup = (groupId: string): string => {
    return getGroupTranslation(language, groupId);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, tGroup }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
