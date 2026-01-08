import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type Lang = 'zh' | 'en';

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  t: <T>(dict: Record<Lang, T>) => T;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const STORAGE_KEY = 'app_lang';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'zh';
    const saved = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
    return saved === 'en' || saved === 'zh' ? saved : 'zh';
  });

  const setLang = (next: Lang) => {
    setLangState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  };

  const toggleLang = () => setLang(lang === 'zh' ? 'en' : 'zh');

  useEffect(() => {
    // 同步 localStorage 里的值（避免并发写入时不一致）
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved && saved !== lang) {
      setLangState(saved === 'en' ? 'en' : 'zh');
    }
  }, [lang]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const value = useMemo(() => {
    const t = <T,>(dict: Record<Lang, T>): T => dict[lang];
    return { lang, setLang, toggleLang, t };
  }, [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
