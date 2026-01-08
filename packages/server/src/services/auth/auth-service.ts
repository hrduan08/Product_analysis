import { addDays } from "date-fns";
import { z } from "zod";

import { prisma } from "../../db/prisma.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import { createSignedToken, parseSignedToken, createRandomToken, hashToken } from "../../utils/token.js";
import { buildVerificationEmail, buildResetPasswordEmail } from "./mail-templates.js";
import { sendMail } from "../mail/sender.js";
import { signAccessToken } from "../../utils/jwt.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { searchTierLimits } from "../../config/search-limits.js";
import { ensureDailyQuotaCapacity } from "../billing/quota-guard.js";
import { notifyOperations } from "../operations-notify.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(64),
  nickname: z.string().max(60).optional(),
  lang: z.enum(["zh", "en"]).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const emailSchema = z.object({
  email: z.string().email(),
  lang: z.enum(["zh", "en"]).optional()
});

const resetConfirmSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(64)
});

const REFRESH_TOKEN_EXPIRY_DAYS = Number(process.env.AUTH_REFRESH_EXPIRES_DAYS ?? "14");

function createHttpError(status: number, message: string): Error {
  const error = new Error(message);
  (error as { status?: number }).status = status;
  return error;
}

type PrismaUser = Prisma.User;
type PrismaUserWithProfile = Prisma.UserGetPayload<{ include: { profile: true } }>;

export async function registerUser(input: unknown) {
  const payload = registerSchema.parse(input);

  const existing = await prisma.user.findUnique({ where: { email: payload.email.toLowerCase() } });
  if (existing) {
    throw createHttpError(409, "邮箱已被注册");
  }

  const passwordHash = await hashPassword(payload.password);
  await ensureDailyQuotaCapacity(searchTierLimits.trial.unitsPerDay);
  const trialEnds = addDays(new Date(), 7);

  const user = await prisma.user.create({
    data: {
      email: payload.email.toLowerCase(),
      password_hash: passwordHash,
      trial_ends_at: trialEnds,
      profile: payload.nickname
        ? {
            create: {
              full_name: payload.nickname
            }
          }
        : undefined
    }
  });

  const syncedUser = await syncUserLifecycle(user);

  await sendVerificationEmail(syncedUser.id, syncedUser.email, payload.lang ?? "zh");

  const tokens = await issueTokens(syncedUser.id);

  void notifyOperations(
    `【注册提醒】新用户 ${syncedUser.email} 已注册，时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`
  ).catch((error) => {
    console.error('[ops-notify] 注册通知失败', error);
  });

  return {
    user: buildUserResponse(syncedUser),
    tokens
  };
}

export async function loginUser(input: unknown) {
  const payload = loginSchema.parse(input);
  const user = await prisma.user.findUnique({ where: { email: payload.email.toLowerCase() } });
  if (!user) {
    throw createHttpError(401, "邮箱或密码错误");
  }
  const valid = await verifyPassword(payload.password, user.password_hash);
  if (!valid) {
    throw createHttpError(401, "邮箱或密码错误");
  }
  const syncedUser = await syncUserLifecycle(user);
  const tokens = await issueTokens(syncedUser.id);
  return {
    user: buildUserResponse(syncedUser),
    tokens
  };
}

export async function resendVerificationEmail(input: unknown) {
  const payload = emailSchema.parse(input);
  const user = await prisma.user.findUnique({ where: { email: payload.email.toLowerCase() } });
  if (!user) {
    return;
  }
  if (user.email_verified_at) {
    return;
  }
  await sendVerificationEmail(user.id, user.email, payload.lang ?? "zh");
}

async function sendVerificationEmail(userId: string, email: string, lang: "zh" | "en" = "zh") {
  const expiresAt = addDays(new Date(), 1).getTime();
  const token = createSignedToken({
    userId,
    type: "email_verification",
    expiresAt
  });
  const message = buildVerificationEmail(token, lang);
  await sendMail(
    {
      subject: message.subject,
      html: message.html,
      text: message.text
    },
    [email]
  );
}

export async function verifyEmail(token: string) {
  const parsed = parseSignedToken(token);
  if (!parsed || parsed.type !== "email_verification") {
    throw createHttpError(400, "邮箱验证链接无效或已过期");
  }
  const user = await prisma.user.findUnique({ where: { id: parsed.userId } });
  if (!user) {
    throw createHttpError(404, "用户不存在");
  }
  let resolvedUser = user;
  if (!user.email_verified_at) {
    resolvedUser = await prisma.user.update({
      where: { id: user.id },
      data: { email_verified_at: new Date() }
    });
  }
  const synced = await syncUserLifecycle(resolvedUser);
  return buildUserResponse(synced);
}

export async function requestPasswordReset(input: unknown) {
  const payload = emailSchema.parse(input);
  const user = await prisma.user.findUnique({ where: { email: payload.email.toLowerCase() } });
  if (!user) return;
  const expiresAt = addDays(new Date(), 1).getTime();
  const token = createSignedToken({
    userId: user.id,
    type: "password_reset",
    expiresAt
  });
  const message = buildResetPasswordEmail(token, payload.lang ?? "zh");
  await sendMail(
    {
      subject: message.subject,
      html: message.html,
      text: message.text
    },
    [user.email]
  );
}

export async function confirmPasswordReset(input: unknown) {
  const payload = resetConfirmSchema.parse(input);
  const parsed = parseSignedToken(payload.token);
  if (!parsed || parsed.type !== "password_reset") {
    throw createHttpError(400, "重置链接无效或已过期");
  }
  const user = await prisma.user.findUnique({ where: { id: parsed.userId } });
  if (!user) {
    throw createHttpError(404, "用户不存在");
  }
  const passwordHash = await hashPassword(payload.password);
  await prisma.user.update({
    where: { id: user.id },
    data: { password_hash: passwordHash }
  });
  await prisma.refreshToken.updateMany({
    where: { user_id: user.id },
    data: { revoked: true }
  });
}

export async function refreshSession(refreshToken: string) {
  const hashed = hashToken(refreshToken);
  const record = await prisma.refreshToken.findFirst({
    where: {
      token_hash: hashed,
      revoked: false,
      expires_at: { gt: new Date() }
    },
    include: { user: true }
  });
  if (!record) {
    throw createHttpError(401, "刷新凭证无效");
  }
  const syncedUser = await syncUserLifecycle(record.user);
  const tokens = await issueTokens(record.user_id, record.id);
  return {
    user: buildUserResponse(syncedUser),
    tokens
  };
}

export async function revokeRefreshToken(refreshToken: string) {
  const hashed = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { token_hash: hashed },
    data: { revoked: true }
  });
}

async function issueTokens(userId: string, reuseTokenId?: string) {
  const accessToken = signAccessToken({ sub: userId });
  const refreshToken = createRandomToken(48);
  const hashed = hashToken(refreshToken);
  const expiresAt = addDays(new Date(), REFRESH_TOKEN_EXPIRY_DAYS);

  if (reuseTokenId) {
    await prisma.refreshToken.update({
      where: { id: reuseTokenId },
      data: {
        token_hash: hashed,
        expires_at: expiresAt,
        revoked: false,
        created_at: new Date()
      }
    });
  } else {
    await prisma.refreshToken.create({
      data: {
        token_hash: hashed,
        user_id: userId,
        expires_at: expiresAt
      }
    });
  }

  return { accessToken, refreshToken };
}

export function shouldUpdateStatusToPastDue(
  user: Pick<PrismaUser, "status" | "trial_ends_at" | "plan_id" | "plan_expire_at">,
  now: Date = new Date()
): boolean {
  if (user.status === "trialing" && user.trial_ends_at <= now) {
    return true;
  }
  if (
    user.status === "active" &&
    user.plan_id &&
    user.plan_expire_at &&
    user.plan_expire_at <= now
  ) {
    return true;
  }
  return false;
}

async function syncUserLifecycle(user: PrismaUser): Promise<PrismaUserWithProfile> {
  if (!shouldUpdateStatusToPastDue(user)) {
    return prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { profile: true }
    });
  }
  return prisma.user.update({
    where: { id: user.id },
    data: { status: "past_due" },
    include: { profile: true }
  });
}

function buildUserResponse(user: PrismaUserWithProfile) {
  const profile = user.profile
    ? {
        nickname: user.profile.full_name ?? null,
        fullName: user.profile.full_name ?? null,
        timezone: user.profile.timezone ?? null,
        locale: user.profile.locale ?? null
      }
    : null;

  return {
    id: user.id,
    email: user.email,
    emailVerified: Boolean(user.email_verified_at),
    emailVerifiedAt: user.email_verified_at,
    status: user.status,
    trialStartedAt: user.trial_started_at ?? null,
    trialEndsAt: user.trial_ends_at,
    planId: user.plan_id,
    planExpireAt: user.plan_expire_at,
    profile
  };
}
