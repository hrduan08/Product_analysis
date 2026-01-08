import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
const LanguageContext = createContext(undefined);
const STORAGE_KEY = 'app_lang';
export function LanguageProvider({ children }) {
    const [lang, setLangState] = useState(() => {
        if (typeof window === 'undefined')
            return 'zh';
        const saved = window.localStorage.getItem(STORAGE_KEY);
        return saved === 'en' || saved === 'zh' ? saved : 'zh';
    });
    const setLang = (next) => {
        setLangState(next);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(STORAGE_KEY, next);
        }
    };
    const toggleLang = () => setLang(lang === 'zh' ? 'en' : 'zh');
    useEffect(() => {
        // 同步 localStorage 里的值（避免并发写入时不一致）
        if (typeof window === 'undefined')
            return;
        const saved = window.localStorage.getItem(STORAGE_KEY);
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
        const t = (dict) => dict[lang];
        return { lang, setLang, toggleLang, t };
    }, [lang]);
    return _jsx(LanguageContext.Provider, { value: value, children: children });
}
export function useLanguage() {
    const ctx = useContext(LanguageContext);
    if (!ctx) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return ctx;
}
