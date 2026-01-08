import { type ReactNode } from 'react';
type Lang = 'zh' | 'en';
type LanguageContextValue = {
    lang: Lang;
    setLang: (lang: Lang) => void;
    toggleLang: () => void;
    t: <T>(dict: Record<Lang, T>) => T;
};
export declare function LanguageProvider({ children }: {
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function useLanguage(): LanguageContextValue;
export {};
