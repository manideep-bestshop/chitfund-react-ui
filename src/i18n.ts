import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
//import translations
import en from './locales/en.json';
import te from './locales/te.json';
import hi from './locales/hi.json'; 

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },// Add more languages here
      te: { translation: te },
      hi: { translation: hi } 
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;