import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";
import { ACCESS_COOKIE, verifyAccessToken } from "../utils/jwt.js";

/**
 * The one gate every protected route goes through:
 * `router.get("/me", requireAuth, asyncHandler(getMe))`. Reads the access
 * token cookie, verifies it, and sets `req.user` (see types/express.d.ts)
 * for downstream handlers. Throws 401 if there's no valid session — it does
 * NOT redirect; that's the frontend's job.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) return next(ApiError.unauthorized());

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(ApiError.unauthorized("Your session expired. Sign in again."));
  }
}

/** Stack after requireAuth: `[requireAuth, requireRole("captain", "admin")]`. */
export function requireRole(...roles: Array<"member" | "captain" | "admin">) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
    next();
  };
}
