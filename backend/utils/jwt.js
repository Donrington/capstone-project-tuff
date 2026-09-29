const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days — matches RefreshToken's expireAfterSeconds intent

const ACCESS_COOKIE = "tuff_access";
const REFRESH_COOKIE = "tuff_refresh";

const baseCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

const accessCookieOptions = { ...baseCookieOptions, maxAge: 15 * 60 * 1000 };
const refreshCookieOptions = { ...baseCookieOptions, maxAge: REFRESH_TOKEN_TTL_MS };

/** @param {{ sub: string, role: "member" | "admin" }} payload */
function signAccessToken(payload) {
  if (!process.env.JWT_ACCESS_SECRET) throw new Error("JWT_ACCESS_SECRET is not set — check .env");
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

/** Throws if missing/expired/invalid — callers should try/catch. */
function verifyAccessToken(token) {
  if (!process.env.JWT_ACCESS_SECRET) throw new Error("JWT_ACCESS_SECRET is not set — check .env");
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

/**
 * A refresh token is a random, high-entropy string — not a JWT, and not
 * hashed with bcrypt (that's for low-entropy human-chosen secrets like
 * passwords). We store its SHA-256 hash in RefreshToken.token, so a
 * database leak alone doesn't hand out valid sessions; the plaintext only
 * ever goes to the client, in the httpOnly cookie.
 */
function generateRefreshToken() {
  const token = crypto.randomBytes(48).toString("hex");
  return { token, hash: hashRefreshToken(token), expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS) };
}

function hashRefreshToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

module.exports = {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOptions,
  refreshCookieOptions,
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
};
