import { createContext, useContext, useState, type ReactNode } from "react";
import { en } from "./en";
import { vi } from "./vi";

export type Language = "en" | "vi";

const STORAGE_KEY = "luckypot:lang";
// Same key the landing page's vanilla-JS toggle reads/writes (see
// landing/index.html) - picking a language on one surface carries over to
// the other without a shared build step between them.
function getInitialLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "vi") return stored;
  } catch {
    /* private mode / storage blocked - default to English */
  }
  return "en";
}

export const dictionaries = { en, vi };
export type Dictionary = typeof en;

const LanguageContext = createContext<{ lang: Language; setLang: (l: Language) => void }>({
  lang: "en",
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(getInitialLanguage);

  function setLang(l: Language) {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* private mode / storage blocked - choice just won't survive a reload */
    }
  }

  return <LanguageContext.Provider value={{ lang, setLang }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

/** The translated string/JSX-builder table for whichever language is active. */
export function useT(): Dictionary {
  const { lang } = useLanguage();
  return dictionaries[lang];
}
