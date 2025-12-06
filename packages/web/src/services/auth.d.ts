import type { AuthSession, User } from '../types/auth';
export type RegisterPayload = {
    email: string;
    password: string;
    nickname?: string;
};
export type LoginPayload = {
    email: string;
    password: string;
};
export type EmailPayload = {
    email: string;
};
export type ResetConfirmPayload = {
    token: string;
    password: string;
};
export type RefreshPayload = {
    refreshToken: string;
};
export declare function register(payload: RegisterPayload): Promise<AuthSession>;
export declare function login(payload: LoginPayload): Promise<AuthSession>;
export declare function resendVerificationEmail(payload: EmailPayload): Promise<void>;
export declare function verifyEmail(token: string): Promise<User>;
export declare function requestPasswordReset(payload: EmailPayload): Promise<void>;
export declare function confirmPasswordReset(payload: ResetConfirmPayload): Promise<void>;
export declare function refresh(payload: RefreshPayload): Promise<AuthSession>;
export declare function logout(payload: RefreshPayload): Promise<void>;
