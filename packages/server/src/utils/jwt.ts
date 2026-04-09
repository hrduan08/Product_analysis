import jwt from "jsonwebtoken";

type JwtPayload = Record<string, unknown>;

const ACCESS_SECRET = process.env.AUTH_JWT_SECRET;
const ACCESS_EXPIRES_IN = process.env.AUTH_JWT_EXPIRES_IN ?? "1h";

if (!ACCESS_SECRET) {
  throw new Error("Missing AUTH_JWT_SECRET");
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}
