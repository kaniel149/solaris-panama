import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import es from './es.json';
import he from './he.json';

let savedLang = 'es';
try {
  const s = localStorage.getItem('solaris_lang');
  if (s === 'es' || s === 'en' || s === 'he') savedLang = s;
} catch { /* ignore */ }

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    he: { translation: he },
  },
  lng: savedLang,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
