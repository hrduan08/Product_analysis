import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
  useRef,
  type ReactNode
} from 'react';

import type { AuthSession, TokenPair, User } from '../types/auth';
import * as authService from '../services/auth';

type AuthContextValue = {
  user: User | null;
  tokens: TokenPair | null;
  setSession: (session: AuthSession | null) => void;
  updateUser: (user: User) => void;
  refresh: () => Promise<AuthSession>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'product-insight-auth';

type ProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: ProviderProps) {
  const [session, setSessionState] = useState<AuthSession | null>(() => loadInitialSession());
  const verifiedRef = useRef(false);

  const persistSession = useCallback((value: AuthSession | null) => {
    if (typeof window === 'undefined') {
      return;
    }
    if (value) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const setSession = useCallback(
    (value: AuthSession | null) => {
      setSessionState(value);
      persistSession(value);
    },
    [persistSession]
  );

  const updateUser = useCallback(
    (user: User) => {
      setSessionState((prev) => {
        if (!prev) {
          return prev;
        }
        const next: AuthSession = {
          ...prev,
          user
        };
        persistSession(next);
        return next;
      });
    },
    [persistSession]
  );

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
      } catch {
        // 忽略登出异常，避免阻塞退出流程
      }
    }
    setSession(null);
  }, [session?.tokens.refreshToken, setSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      tokens: session?.tokens ?? null,
      setSession,
      updateUser,
      refresh,
      logout
    }),
    [session, setSession, updateUser, refresh, logout]
  );

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
      } catch {
        setSession(null);
      }
    })();
  }, [refresh, session?.tokens.refreshToken, setSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth 必须在 AuthProvider 内部使用');
  }
  return context;
}

function loadInitialSession(): AuthSession | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    if (!parsed.tokens?.refreshToken) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
