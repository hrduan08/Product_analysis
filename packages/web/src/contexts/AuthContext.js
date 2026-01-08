import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useMemo, useState, useEffect, useRef } from 'react';
import * as authService from '../services/auth';
const AuthContext = createContext(undefined);
const STORAGE_KEY = 'product-insight-auth';
export function AuthProvider({ children }) {
    const [session, setSessionState] = useState(() => loadInitialSession());
    const verifiedRef = useRef(false);
    const persistSession = useCallback((value) => {
        if (typeof window === 'undefined') {
            return;
        }
        if (value) {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
        }
        else {
            window.localStorage.removeItem(STORAGE_KEY);
        }
    }, []);
    const setSession = useCallback((value) => {
        setSessionState(value);
        persistSession(value);
    }, [persistSession]);
    const updateUser = useCallback((user) => {
        setSessionState((prev) => {
            if (!prev) {
                return prev;
            }
            const next = {
                ...prev,
                user
            };
            persistSession(next);
            return next;
        });
    }, [persistSession]);
    const refresh = useCallback(async () => {
        if (!session?.tokens.refreshToken) {
            throw new Error('缺少刷新凭证');
        }
        const next = await authService.refresh({ refreshToken: session.tokens.refreshToken });
        setSession(next);
        return next;
    }, [session?.tokens.refreshToken, setSession]);
    const logout = useCallback(async () => {
        const refreshToken = session?.tokens.refreshToken;
        if (refreshToken) {
            try {
                await authService.logout({ refreshToken });
            }
            catch {
                // 忽略登出异常，避免阻塞退出流程
            }
        }
        setSession(null);
    }, [session?.tokens.refreshToken, setSession]);
    const value = useMemo(() => ({
        user: session?.user ?? null,
        tokens: session?.tokens ?? null,
        setSession,
        updateUser,
        refresh,
        logout
    }), [session, setSession, updateUser, refresh, logout]);
    useEffect(() => {
        if (verifiedRef.current) {
            return;
        }
        verifiedRef.current = true;
        if (!session?.tokens.refreshToken) {
            return;
        }
        void (async () => {
            try {
                await refresh();
            }
            catch {
                setSession(null);
            }
        })();
    }, [refresh, session?.tokens.refreshToken, setSession]);
    return _jsx(AuthContext.Provider, { value: value, children: children });
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth 必须在 AuthProvider 内部使用');
    }
    return context;
}
function loadInitialSession() {
    if (typeof window === 'undefined') {
        return null;
    }
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            return null;
        }
        if (!parsed.tokens?.refreshToken) {
            return null;
        }
        return parsed;
    }
    catch {
        return null;
    }
}
