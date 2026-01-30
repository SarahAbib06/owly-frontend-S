import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import translationEN from "./locales/en.json";
import translationFR from "./locales/fr.json";

const resources = {
  en: { translation: translationEN },
  fr: { translation: translationFR },
};


  // Récupérer la langue sauvegardée ou utiliser 'fr' par défaut
const savedLanguage = localStorage.getItem("language") || "fr";

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage, // Utiliser la langue sauvegardée au lieu de "fr" en dur
    fallbackLng: "fr", // Langue de secours
    interpolation: { escapeValue: false },
  });

export default i18n;