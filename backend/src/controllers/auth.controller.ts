import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import { User } from "../models/User.model.js";
import { ApiError } from "../utils/ApiError.js";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOptions,
  refreshCookieOptions,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";

/**
 * Reference implementation for the whole module: this is the pattern the
 * rest of the controllers (challenge, team, activity, …) should copy —
 * validate → do the work → shape the response. See routes/auth.routes.ts
 * for how it's wired to a route + validator + asyncHandler.
 */

function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function issueSession(res: Response, userId: string, role: "member" | "captain" | "admin") {
  res.cookie(ACCESS_COOKIE, signAccessToken({ sub: userId, role }), accessCookieOptions);
  res.cookie(REFRESH_COOKIE, signRefreshToken(userId), refreshCookieOptions);
}

// POST /auth/sign-up — frontend calls this from app/(auth)/actions.ts signUp
export async function signUp(req: Request, res: Response) {
  const { name, email, password } = req.body as { name: string; email: string; password: string };

  const existing = await User.findOne({ email });
  if (existing) throw ApiError.conflict("That email already has an account.");

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    firstName: name.split(" ")[0] || name,
    displayName: name.split(" ")[0] || name,
    email,
    passwordHash,
    initials: initialsOf(name),
  });

  issueSession(res, user.id, "member");
  res.status(201).json(user.toJSON());
}

// POST /auth/sign-in — frontend calls this from app/(auth)/actions.ts signIn
export async function signIn(req: Request, res: Response) {
  const { email, password } = req.body as { email: string; password: string };

  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user) throw ApiError.unauthorized("Wrong email or password.");

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized("Wrong email or password.");

  issueSession(res, user.id, (user as unknown as { role: "member" }).role ?? "member");
  res.json(user.toJSON());
}

// POST /auth/sign-out — frontend calls this from app/(app)/actions.ts signOut
export async function signOut(_req: Request, res: Response) {
  res.clearCookie(ACCESS_COOKIE, { path: "/" });
  res.clearCookie(REFRESH_COOKIE, { path: "/" });
  res.status(204).end();
}

// POST /auth/refresh — the access token is short-lived (15m); the frontend
// calls this when a request comes back 401 to get a new one silently.
export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw ApiError.unauthorized();

  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized("Your session expired. Sign in again.");
  }

  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized();

  issueSession(res, user.id, (user as unknown as { role: "member" }).role ?? "member");
  res.status(204).end();
}
