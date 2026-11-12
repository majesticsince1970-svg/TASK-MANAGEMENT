import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import ml from './ml.json';

const savedLang = typeof window !== 'undefined'
  ? localStorage.getItem('majestic-ops-lang') || 'en'
  : 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ml: { translation: ml },
  },
  lng: savedLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng: string) => {
  localStorage.setItem('majestic-ops-lang', lng);
  document.documentElement.lang = lng;
});

export default i18n;
