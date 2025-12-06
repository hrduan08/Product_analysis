import type { Platform } from '../types/feedback';
type SearchBarProps = {
    platform: Platform;
    onPlatformChange: (platform: Platform) => void;
    defaultValue?: string;
    loading?: boolean;
    onSearch: (keyword: string) => void;
    history?: string[];
    onHistorySelect?: (keyword: string) => void;
    onHistoryClear?: () => void;
};
export declare function SearchBar({ platform, onPlatformChange, defaultValue, loading, onSearch, history, onHistorySelect, onHistoryClear }: SearchBarProps): import("react/jsx-runtime").JSX.Element;
export {};
