import crypto from "node:crypto";

const TOKEN_SECRET = process.env.AUTH_TOKEN_HMAC_SECRET;

if (!TOKEN_SECRET) {
  throw new Error("Missing AUTH_TOKEN_HMAC_SECRET");
}

type TokenType = "email_verification" | "password_reset";

export type SignedTokenPayload = {
  userId: string;
  type: TokenType;
  expiresAt: number;
};

export function createSignedToken(payload: SignedTokenPayload): string {
  const base = `${payload.userId}|${payload.type}|${payload.expiresAt}`;
  const signature = crypto.createHmac("sha256", TOKEN_SECRET).update(base).digest("hex");
  return Buffer.from(`${base}|${signature}`).toString("base64url");
}

export function parseSignedToken(token: string): SignedTokenPayload | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [userId, type, expiresAtRaw, signature] = decoded.split("|");
    if (!userId || !type || !expiresAtRaw || !signature) {
      return null;
    }

    const expected = crypto.createHmac("sha256", TOKEN_SECRET)
      .update(`${userId}|${type}|${expiresAtRaw}`)
      .digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"))) {
      return null;
    }

    const expiresAt = Number(expiresAtRaw);
    if (Number.isNaN(expiresAt) || Date.now() > expiresAt) {
      return null;
    }

    if (type !== "email_verification" && type !== "password_reset") {
      return null;
    }

    return { userId, type, expiresAt };
  } catch {
    return null;
  }
}

export function createRandomToken(bytes = 48): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
