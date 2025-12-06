export type UserStatus = 'trialing' | 'active' | 'past_due' | 'canceled';
export type UserProfile = {
    nickname: string | null;
    fullName: string | null;
    timezone: string | null;
    locale: string | null;
};
export type User = {
    id: string;
    email: string;
    emailVerified: boolean;
    emailVerifiedAt: string | null;
    status: UserStatus;
    trialStartedAt: string | null;
    trialEndsAt: string | null;
    planId: string | null;
    planExpireAt: string | null;
    profile: UserProfile | null;
};
export type TokenPair = {
    accessToken: string;
    refreshToken: string;
};
export type AuthSession = {
    user: User;
    tokens: TokenPair;
};
