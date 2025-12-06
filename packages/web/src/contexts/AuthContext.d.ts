import { type ReactNode } from 'react';
import type { AuthSession, TokenPair, User } from '../types/auth';
type AuthContextValue = {
    user: User | null;
    tokens: TokenPair | null;
    setSession: (session: AuthSession | null) => void;
    updateUser: (user: User) => void;
    refresh: () => Promise<AuthSession>;
    logout: () => Promise<void>;
};
type ProviderProps = {
    children: ReactNode;
};
export declare function AuthProvider({ children }: ProviderProps): import("react/jsx-runtime").JSX.Element;
export declare function useAuth(): AuthContextValue;
export {};
