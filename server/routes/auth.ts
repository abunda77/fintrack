import { Router } from "express";
import { loginInputSchema } from "../../shared/schemas";
import { ApiError, asyncHandler } from "../errors";
import {
  clearSessionCookie,
  getCredentials,
  isAuthenticated,
  setSessionCookie,
  verifyCredentials,
} from "../auth";

export const authRouter = Router();

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

function clientKey(req: { ip?: string }): string {
  return req.ip ?? "unknown";
}

function checkRateLimit(key: string): void {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  entry.count += 1;
  if (entry.count > MAX_ATTEMPTS) {
    throw new ApiError(
      429,
      "TOO_MANY_ATTEMPTS",
      "Terlalu banyak percobaan masuk. Coba lagi beberapa menit lagi.",
    );
  }
}

function resetRateLimit(key: string): void {
  attempts.delete(key);
}

function sessionPayload(): { authenticated: boolean; username: string | null } {
  return { authenticated: true, username: getCredentials().username };
}

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const key = clientKey(req);
    const input = loginInputSchema.parse(req.body);
    checkRateLimit(key);

    if (!verifyCredentials(input.username, input.password)) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Username atau password salah.");
    }

    resetRateLimit(key);
    setSessionCookie(res);
    res.setHeader("Cache-Control", "no-store");
    res.json(sessionPayload());
  }),
);

authRouter.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.setHeader("Cache-Control", "no-store");
  res.json({ authenticated: false, username: null });
});

authRouter.get("/session", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (isAuthenticated(req)) {
    res.json(sessionPayload());
    return;
  }
  res.json({ authenticated: false, username: null });
});
