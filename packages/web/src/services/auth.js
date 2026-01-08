import { API_BASE } from './api';
export async function register(payload) {
    const result = await post('/api/auth/register', payload);
    return normalizeSession(result);
}
export async function login(payload) {
    const result = await post('/api/auth/login', payload);
    return normalizeSession(result);
}
export async function resendVerificationEmail(payload) {
    await postVoid('/api/auth/email/resend', payload);
}
export async function verifyEmail(token) {
    const result = await post('/api/auth/email/verify', { token });
    return normalizeUser(result.user);
}
export async function requestPasswordReset(payload) {
    await postVoid('/api/auth/password/reset/request', payload);
}
export async function confirmPasswordReset(payload) {
    await postVoid('/api/auth/password/reset/confirm', payload);
}
export async function refresh(payload) {
    const result = await post('/api/auth/refresh', payload);
    return normalizeSession(result);
}
export async function logout(payload) {
    await postVoid('/api/auth/logout', payload);
}
async function post(path, body) {
    return request(path, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
}
async function postVoid(path, body) {
    await post(path, body);
}
async function request(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, options);
    let parsed = null;
    if (response.status !== 204) {
        const raw = await response.text();
        if (raw) {
            try {
                parsed = JSON.parse(raw);
            }
            catch {
                parsed = raw;
            }
        }
    }
    if (!response.ok) {
        const message = typeof parsed === 'object' && parsed !== null && 'message' in parsed
            ? parsed.message ?? '请求失败'
            : typeof parsed === 'string' && parsed.length > 0
                ? parsed
                : '请求失败';
        throw new Error(message);
    }
    return parsed;
}
function normalizeSession(response) {
    return {
        user: normalizeUser(response.user),
        tokens: response.tokens
    };
}
function normalizeUser(raw) {
    const profile = raw.profile
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
