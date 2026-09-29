import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import es from './locales/es.json';
import ca from './locales/ca.json';

// en.json and fr.json exist but are incomplete: add them here (and in
// LanguageSelector) when they are ready. Listing them let the browser
// detector switch to a language the selector cannot show.

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      ca: { translation: ca },
    },
    fallbackLng: 'es',
    supportedLngs: ['es', 'ca'],
    // es-ES, ca-ES… resolve to es / ca
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'windradar_lang',
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
