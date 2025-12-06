import { Router, type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";

import {
  confirmPasswordReset,
  loginUser,
  refreshSession,
  registerUser,
  requestPasswordReset,
  resendVerificationEmail,
  revokeRefreshToken,
  verifyEmail
} from "../services/auth/auth-service.js";

const router = Router();

router.post("/register", async (req, res, next) => {
  try {
    const result = await registerUser(req.body);
    res.status(201).json(result);
  } catch (error) {
    handleError(error, next);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const result = await loginUser(req.body);
    res.json(result);
  } catch (error) {
    handleError(error, next);
  }
});

router.post("/email/resend", async (req, res, next) => {
  try {
    await resendVerificationEmail(req.body);
    res.status(204).end();
  } catch (error) {
    handleError(error, next);
  }
});

router.post("/email/verify", async (req, res, next) => {
  try {
    if (typeof req.body?.token !== "string") {
      const err = new Error("缺少验证 token");
      (err as { status?: number }).status = 400;
      throw err;
    }
    const user = await verifyEmail(req.body.token);
    res.json({ user });
  } catch (error) {
    handleError(error, next);
  }
});

router.post("/password/reset/request", async (req, res, next) => {
  try {
    await requestPasswordReset(req.body);
    res.status(204).end();
  } catch (error) {
    handleError(error, next);
  }
});

router.post("/password/reset/confirm", async (req, res, next) => {
  try {
    await confirmPasswordReset(req.body);
    res.status(204).end();
  } catch (error) {
    handleError(error, next);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const refreshToken = typeof req.body?.refreshToken === "string" ? req.body.refreshToken : null;
    if (!refreshToken) {
      const err = new Error("缺少 refreshToken");
      (err as { status?: number }).status = 400;
      throw err;
    }
    const result = await refreshSession(refreshToken);
    res.json(result);
  } catch (error) {
    handleError(error, next);
  }
});

router.post("/logout", async (req, res, next) => {
  try {
    const refreshToken = typeof req.body?.refreshToken === "string" ? req.body.refreshToken : null;
    if (!refreshToken) {
      res.status(204).end();
      return;
    }
    await revokeRefreshToken(refreshToken);
    res.status(204).end();
  } catch (error) {
    handleError(error, next);
  }
});

function handleError(error: unknown, next: NextFunction) {
  if (error instanceof ZodError) {
    const message = error.issues[0]?.message ?? "请求参数不合法";
    const err = new Error(message);
    (err as { status?: number }).status = 422;
    next(err);
    return;
  }
  next(error as Error);
}

export default router;
