const ApiError = require("../utils/ApiError");
const { ACCESS_COOKIE, verifyAccessToken } = require("../utils/jwt");

/**
 * The one gate every protected route goes through:
 * `router.get("/me", requireAuth, asyncHandler(getMe))`. Reads the access
 * token cookie, verifies it, and sets `req.user` for downstream handlers.
 * Throws 401 if there's no valid session — it does NOT redirect, that's
 * the frontend's job.
 */
function requireAuth(req, res, next) {
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

/** Stack after requireAuth: `[requireAuth, requireRole("admin")]`. */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
    next();
  };
}

module.exports = { requireAuth, requireRole };
