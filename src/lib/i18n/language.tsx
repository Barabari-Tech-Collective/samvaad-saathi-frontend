"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { journey } from "./hi-journey";
import { hi as firstScreens } from "./hi";
import { PageTranslator, tidy } from "./page-translator";

const hi = new Map(Object.entries({ ...journey, ...firstScreens }).map(([en, text]) => [tidy(en), text]));

export type Language = "en" | "hi";
const STORAGE_KEY = "samvaad-language";

type LanguageContext = {
  language: Language;
  setLanguage: (language: Language) => void;
  /** Hindi for the screens that have been translated; anything else stays in English. */
  t: (text: string) => string;
};

// Without a provider (tests, isolated components) everything simply stays English.
const Context = createContext<LanguageContext>({
  language: "en",
  setLanguage: () => undefined,
  t: (text) => text,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  // Read the saved choice after the first render so server and browser markup match.
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "hi") setLanguageState("hi");
    } catch {
      /* The choice just is not remembered if storage is blocked. */
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* Not remembered; still applies for this visit. */
    }
  }, []);
  const t = useCallback(
    (text: string) => (language === "hi" ? (hi.get(tidy(text)) ?? text) : text),
    [language]
  );
  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  return <Context.Provider value={value}>
      <PageTranslator language={language} dictionary={hi} />{children}</Context.Provider>;
}

export const useLanguage = () => useContext(Context);
