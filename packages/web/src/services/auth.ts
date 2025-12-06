import { API_BASE } from './api';
import type { AuthSession, TokenPair, User, UserProfile, UserStatus } from '../types/auth';

type RawUserProfile = {
  nickname: string | null;
  fullName: string | null;
  timezone: string | null;
  locale: string | null;
};

type RawUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  status: UserStatus;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  planId: string | null;
  planExpireAt: string | null;
  profile: RawUserProfile | null;
};

type SessionResponse = {
  user: RawUser;
  tokens: TokenPair;
};

type VerifyResponse = {
  user: RawUser;
};

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

export async function register(payload: RegisterPayload): Promise<AuthSession> {
  const result = await post<SessionResponse>('/api/auth/register', payload);
  return normalizeSession(result);
}

export async function login(payload: LoginPayload): Promise<AuthSession> {
  const result = await post<SessionResponse>('/api/auth/login', payload);
  return normalizeSession(result);
}

export async function resendVerificationEmail(payload: EmailPayload): Promise<void> {
  await postVoid('/api/auth/email/resend', payload);
}

export async function verifyEmail(token: string): Promise<User> {
  const result = await post<VerifyResponse>('/api/auth/email/verify', { token });
  return normalizeUser(result.user);
}

export async function requestPasswordReset(payload: EmailPayload): Promise<void> {
  await postVoid('/api/auth/password/reset/request', payload);
}

export async function confirmPasswordReset(payload: ResetConfirmPayload): Promise<void> {
  await postVoid('/api/auth/password/reset/confirm', payload);
}

export async function refresh(payload: RefreshPayload): Promise<AuthSession> {
  const result = await post<SessionResponse>('/api/auth/refresh', payload);
  return normalizeSession(result);
}

export async function logout(payload: RefreshPayload): Promise<void> {
  await postVoid('/api/auth/logout', payload);
}

async function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
}

async function postVoid(path: string, body: unknown): Promise<void> {
  await post<unknown>(path, body);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, options);
  let parsed: unknown = null;

  if (response.status !== 204) {
    const raw = await response.text();
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = raw;
      }
    }
  }

  if (!response.ok) {
    const message =
      typeof parsed === 'object' && parsed !== null && 'message' in parsed
        ? (parsed as { message?: string }).message ?? '请求失败'
        : typeof parsed === 'string' && parsed.length > 0
        ? parsed
        : '请求失败';
    throw new Error(message);
  }

  return parsed as T;
}

function normalizeSession(response: SessionResponse): AuthSession {
  return {
    user: normalizeUser(response.user),
    tokens: response.tokens
  };
}

function normalizeUser(raw: RawUser): User {
  const profile: UserProfile | null = raw.profile
    ? {
        nickname: raw.profile.nickname ?? raw.profile.fullName ?? null,
        fullName: raw.profile.fullName ?? raw.profile.nickname ?? null,
        timezone: raw.profile.timezone ?? null,
        locale: raw.profile.locale ?? null
      }
    : null;

  return {
    id: raw.id,
    email: raw.email,
    emailVerified: Boolean(raw.emailVerified),
    emailVerifiedAt: raw.emailVerifiedAt ?? null,
    status: raw.status,
    trialStartedAt: raw.trialStartedAt ?? null,
    trialEndsAt: raw.trialEndsAt,
    planId: raw.planId ?? null,
    planExpireAt: raw.planExpireAt ?? null,
    profile
  };
}
