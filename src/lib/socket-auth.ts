import crypto from "crypto";
import { isValidRole, Role } from "./auth-rules";

export type SocketTokenPayload = {
  userId: string;
  role: Role;
  exp: number;
};

export function getSocketAuthSecret(): string {
  const secret = process.env.SOCKET_AUTH_SECRET || process.env.CLERK_SECRET_KEY;
  if (!secret) {
    throw new Error("Missing SOCKET_AUTH_SECRET or CLERK_SECRET_KEY");
  }
  return secret;
}

function base64UrlEncode(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

export function createSocketToken(
  userId: string,
  role: Role,
  secret: string,
  ttlSeconds = 300
): string {
  const payload: SocketTokenPayload = {
    userId,
    role,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = base64UrlEncode(
    crypto.createHmac("sha256", secret).update(encoded).digest()
  );
  return `${encoded}.${signature}`;
}

export function verifySocketToken(
  token: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000)
): SocketTokenPayload | null {
  if (!token || !secret) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encoded, providedSig] = parts;
  if (!encoded || !providedSig) return null;

  const expectedSig = base64UrlEncode(
    crypto.createHmac("sha256", secret).update(encoded).digest()
  );

  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(encoded)) as Partial<SocketTokenPayload>;
    if (
      typeof parsed.userId !== "string" ||
      !parsed.userId ||
      !isValidRole(parsed.role) ||
      typeof parsed.exp !== "number" ||
      parsed.exp <= nowSeconds
    ) {
      return null;
    }
    return {
      userId: parsed.userId,
      role: parsed.role,
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}
