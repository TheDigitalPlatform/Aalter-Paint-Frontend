/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import {
  getLocaleSync,
  resolveTranslation,
  type Language,
  type TranslationObject,
} from "../locales/loadLocale";

const DEFAULT_LANGUAGE: Language = "NL";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  resetToDefaultLanguage: () => void;
  t: (
    path: string,
    fallbackOrParams?: string | Record<string, string | number>,
    params?: Record<string, string | number>
  ) => string;
  isLocaleLoading: boolean;
}

const LanguageContext = React.createContext<LanguageContextType | undefined>(
  undefined,
);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = React.useState<Language>(() => {
    const saved = localStorage.getItem("app_language");
    return saved === "GB" || saved === "NL" || saved === "EN" ? (saved as Language) : DEFAULT_LANGUAGE;
  });
  const [messages, setMessages] = React.useState<TranslationObject>(() =>
    getLocaleSync(language)
  );
  const [isLocaleLoading, setIsLocaleLoading] = React.useState(false);

  React.useEffect(() => {
    const data = getLocaleSync(language);
    setMessages(data);
    setIsLocaleLoading(false);
    localStorage.setItem("app_language", language);
  }, [language]);

  const resetToDefaultLanguage = React.useCallback(() => {
    setLanguage("NL");
    localStorage.setItem("app_language", "NL");
  }, []);

  React.useEffect(() => {
    const handleReset = () => {
      resetToDefaultLanguage();
    };
    window.addEventListener("app_language_reset", handleReset);
    return () => window.removeEventListener("app_language_reset", handleReset);
  }, [resetToDefaultLanguage]);

  const t = React.useCallback(
    (
      path: string,
      fallbackOrParams?: string | Record<string, string | number>,
      params?: Record<string, string | number>
    ): string => {
      let fallback: string | undefined;
      let actualParams: Record<string, string | number> | undefined = params;

      if (typeof fallbackOrParams === "object" && fallbackOrParams !== null) {
        actualParams = fallbackOrParams;
        fallback = undefined;
      } else if (typeof fallbackOrParams === "string") {
        fallback = fallbackOrParams;
      }

      if (!messages) {
        let str = fallback ?? path;
        if (actualParams) {
          Object.entries(actualParams).forEach(([k, v]) => {
            str = str.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v));
            str = str.replace(new RegExp(`{\\s*${k}\\s*}`, 'g'), String(v));
          });
        }
        return str;
      }
      return resolveTranslation(messages, path, fallback, actualParams);
    },
    [messages],
  );

  const value = React.useMemo(
    () => ({ language, setLanguage, resetToDefaultLanguage, t, isLocaleLoading }),
    [language, resetToDefaultLanguage, t, isLocaleLoading],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = React.useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
}

export const useLanguage = useTranslation;

export type { Language };
