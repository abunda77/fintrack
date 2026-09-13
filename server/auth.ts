import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

/**
 * Autentikasi sederhana berbasis cookie sesi bertanda tangan (HMAC-SHA256).
 *
 * Kredensial dibaca dari environment:
 * - AUTH_USERNAME (wajib)
 * - AUTH_PASSWORD (wajib)
 * - AUTH_SECRET   (opsional; jika kosong diturunkan dari username+password)
 * - AUTH_SESSION_HOURS (opsional; default 168 jam / 7 hari)
 */
export const SESSION_COOKIE = "fintrack_session";

const DEFAULT_SESSION_HOURS = 168;

function getSessionTtlMs(): number {
  const raw = Number(process.env.AUTH_SESSION_HOURS);
  const hours = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_SESSION_HOURS;
  return hours * 60 * 60 * 1000;
}

export function getCredentials(): { username: string | null; password: string | null } {
  return {
    username: process.env.AUTH_USERNAME?.trim() || null,
    password: process.env.AUTH_PASSWORD || null,
  };
}

/** Gagal cepat saat server start bila kredensial belum dikonfigurasi. */
export function assertAuthConfigured(): void {
  const { username, password } = getCredentials();
  const missing: string[] = [];
  if (!username) missing.push("AUTH_USERNAME");
  if (!password) missing.push("AUTH_PASSWORD");
  if (missing.length > 0) {
    throw new Error(
      `Konfigurasi autentikasi tidak lengkap: ${missing.join(", ")}. ` +
        "Isi variabel tersebut di file .env (lihat .env.example).",
    );
  }
}

/** Kunci HMAC. Bila AUTH_SECRET tidak diisi, turunkan dari kredensial. */
function signingKey(): string {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  const { username, password } = getCredentials();
  return createHmac("sha256", "fintrack-auth-v1")
    .update(`${username ?? ""}:${password ?? ""}`)
    .digest("hex");
}

function sign(payload: string): string {
  return createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Bandingkan kredensial dengan aman terhadap timing attack. */
export function verifyCredentials(username: string, password: string): boolean {
  const creds = getCredentials();
  if (!creds.username || !creds.password) return false;
  const userOk = safeEqual(username, creds.username);
  const passOk = safeEqual(password, creds.password);
  return userOk && passOk;
}

export function createSessionToken(): string {
  const { username } = getCredentials();
  const payload = Buffer.from(
    JSON.stringify({ u: username, exp: Date.now() + getSessionTtlMs() }),
    "utf8",
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return false;
  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!safeEqual(sign(payload), signature)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      u?: string;
      exp?: number;
    };
    if (typeof data.exp !== "number" || data.exp < Date.now()) return false;
    return data.u === getCredentials().username;
  } catch {
    return false;
  }
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    const key = part.slice(0, index).trim();
    if (!key) continue;
    try {
      cookies[key] = decodeURIComponent(part.slice(index + 1).trim());
    } catch {
      cookies[key] = part.slice(index + 1).trim();
    }
  }
  return cookies;
}

export function isAuthenticated(req: Request): boolean {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  return verifySessionToken(token);
}

export function setSessionCookie(res: Response): void {
  res.cookie(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getSessionTtlMs(),
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

/** Middleware yang menolak request tanpa sesi valid. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (isAuthenticated(req)) {
    next();
    return;
  }
  res.status(401).json({
    error: {
      code: "UNAUTHORIZED",
      message: "Sesi tidak valid atau sudah berakhir. Silakan masuk kembali.",
      fieldErrors: {},
    },
  });
}
