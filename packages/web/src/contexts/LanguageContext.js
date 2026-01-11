import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
const LanguageContext = createContext(undefined);
const STORAGE_KEY = 'app_lang';
export function LanguageProvider({ children }) {
    const [lang, setLangState] = useState(() => {
        if (typeof window === 'undefined')
            return 'zh';
        const pathLang = window.location.pathname.startsWith('/zh') ? 'zh' : null;
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved === 'en' || saved === 'zh')
            return saved;
        const browserLang = (navigator.languages?.[0] ?? navigator.language ?? '').toLowerCase();
        if (pathLang)
            return 'zh';
        return browserLang.startsWith('zh') ? 'zh' : 'en';
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
            const titleText = lang === 'zh'
                ? '让用户真实声音驱动你的产品决策'
                : 'Let real user voices guide your product decisions';
            const descriptionText = lang === 'zh'
                ? '持续分析 YouTube / Reddit 等平台的用户源声，帮你第一时间了解用户真实需求，并做出正确的产品决策'
                : 'Continuously track user feedback on YouTube, Reddit and more—see what users really want instantly, and make the right product decisions.';
            if (document.title !== titleText) {
                document.title = titleText;
            }
            const ensureMeta = (name) => {
                const existing = document.querySelector(`meta[name="${name}"]`);
                if (existing)
                    return existing;
                const meta = document.createElement('meta');
                meta.name = name;
                document.head.appendChild(meta);
                return meta;
            };
            ensureMeta('description').setAttribute('content', descriptionText);
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
