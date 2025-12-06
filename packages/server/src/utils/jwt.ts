import jwt from "jsonwebtoken";

type JwtPayload = Record<string, unknown>;

const ACCESS_SECRET = process.env.AUTH_JWT_SECRET;
const ACCESS_EXPIRES_IN = process.env.AUTH_JWT_EXPIRES_IN ?? "1h";
const REFRESH_SECRET = process.env.AUTH_REFRESH_SECRET;
const REFRESH_EXPIRES_IN = process.env.AUTH_REFRESH_EXPIRES_IN ?? "7d";

if (!ACCESS_SECRET) {
  throw new Error("Missing AUTH_JWT_SECRET");
}

if (!REFRESH_SECRET) {
  throw new Error("Missing AUTH_REFRESH_SECRET");
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

export function verifyAccessToken<T = JwtPayload>(token: string): T {
  return jwt.verify(token, ACCESS_SECRET) as T;
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

export function verifyRefreshToken<T = JwtPayload>(token: string): T {
  return jwt.verify(token, REFRESH_SECRET) as T;
}
