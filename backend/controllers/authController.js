const bcrypt = require("bcryptjs");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const ApiError = require("../utils/ApiError");
const { ACCESS_COOKIE, REFRESH_COOKIE, accessCookieOptions, signAccessToken, hashRefreshToken } = require("../utils/jwt");
const { toSafeUser } = require("../utils/serializeUser");
const { issueSession, clearSession } = require("../utils/session");
const googleAuth = require("../services/googleAuth");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/; // matches frontend/app/(auth)/actions.ts exactly

// POST /api/auth/sign-up — frontend: app/(auth)/actions.ts signUp
async function signUp(req, res) {
  const firstName = String(req.body.firstName ?? "").trim();
  const lastName = String(req.body.lastName ?? "").trim();
  const email = String(req.body.email ?? "")
    .trim()
    .toLowerCase();
  const password = String(req.body.password ?? "");

  const errors = {};
  if (firstName.length < 1) errors.firstName = "Tell us what to call you.";
  if (lastName.length < 1) errors.lastName = "Enter your last name.";
  if (!EMAIL_RE.test(email)) errors.email = "That doesn't look like an email address.";
  if (password.length < 8) errors.password = "Use at least 8 characters.";
  if (Object.keys(errors).length > 0) throw ApiError.badRequest("Check the form and try again.", errors);

  const existing = await User.findOne({ email });
  if (existing) throw ApiError.conflict("That email already has an account.");

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ firstName, lastName, email, passwordHash });

  await issueSession(res, user);
  res.status(201).json(toSafeUser(user));
}

// POST /api/auth/sign-in — frontend: app/(auth)/actions.ts signIn
async function signIn(req, res) {
  const email = String(req.body.email ?? "")
    .trim()
    .toLowerCase();
  const password = String(req.body.password ?? "");

  const errors = {};
  if (!EMAIL_RE.test(email)) errors.email = "Enter the email you signed up with.";
  if (!password) errors.password = "Enter your password.";
  if (Object.keys(errors).length > 0) throw ApiError.badRequest("Check the form and try again.", errors);

  // Same message either way — don't tell an attacker which part was wrong.
  const WRONG = "Wrong email or password.";
  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user) throw ApiError.unauthorized(WRONG);
  // Sign-up already says whether an email has an account, so naming the
  // way in gives nothing extra away.
  if (!user.passwordHash) throw ApiError.unauthorized("That account signs in with Google. Use Continue with Google instead.");

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized(WRONG);

  await issueSession(res, user);
  res.json(toSafeUser(user));
}

// POST /api/auth/google — frontend: app/auth/google/callback/route.ts.
// Body: { code, codeVerifier, redirectUri } from Google's redirect. Signs in
// the account with this Google id; otherwise links the account with this
// (Google-verified) email; otherwise creates one.
async function googleSignIn(req, res) {
  if (!googleAuth.isConfigured()) throw ApiError.unavailable("Google sign-in isn't set up yet.");

  const code = String(req.body.code ?? "");
  const codeVerifier = String(req.body.codeVerifier ?? "");
  const redirectUri = String(req.body.redirectUri ?? "");
  if (!code || !codeVerifier || !redirectUri) throw ApiError.badRequest("Google sign-in didn't go through. Try again.");

  const profile = await googleAuth.verifyGoogleCode({ code, codeVerifier, redirectUri });
  if (!profile?.sub || !profile.email || profile.email_verified !== true) {
    throw ApiError.badRequest("That Google account's email isn't verified, so it can't sign in to TUFF.");
  }
  const email = profile.email.toLowerCase();

  let user = await User.findOne({ googleId: profile.sub });
  let isNew = false;

  if (!user) {
    user = await User.findOne({ email }).select("+passwordHash");
    if (user) {
      // Google just proved this person owns the address; TUFF's own sign-up
      // never did. A password set by whoever registered the address first
      // could be a squatter's, so it goes, along with every other session.
      // The owner keeps full access through Google.
      user.googleId = profile.sub;
      if (user.passwordHash) {
        user.passwordHash = undefined;
        await RefreshToken.deleteMany({ user: user._id });
      }
      await user.save();
    } else {
      const [first, ...rest] = String(profile.name ?? "").trim().split(/\s+/);
      user = await User.create({
        firstName: profile.given_name || first || email.split("@")[0],
        lastName: profile.family_name || rest.join(" "),
        email,
        googleId: profile.sub,
        profilePicture: profile.picture || null,
      });
      isNew = true;
    }
  }

  await issueSession(res, user);
  res.status(isNew ? 201 : 200).json({ user: toSafeUser(user), isNew });
}

// POST /api/auth/sign-out — frontend: app/(app)/actions.ts signOut
async function signOut(req, res) {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  if (refreshToken) {
    // Revoke it server-side, not just delete the cookie — otherwise a
    // stolen refresh token would keep working after "signing out".
    await RefreshToken.deleteOne({ token: hashRefreshToken(refreshToken) });
  }
  clearSession(res);
  res.status(204).end();
}

// POST /api/auth/refresh — the access token is short-lived (15m); the
// frontend calls this when a request comes back 401 to get a new one
// silently. Reissues the access token only, not the refresh token —
// simpler than rotating on every call, at the cost of a refresh token
// being valid for its full 30 days rather than shrinking its window.
async function refresh(req, res) {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  if (!refreshToken) throw ApiError.unauthorized();

  const stored = await RefreshToken.findOne({ token: hashRefreshToken(refreshToken) });
  if (!stored || stored.expiresAt < new Date()) throw ApiError.unauthorized("Your session expired. Sign in again.");

  const user = await User.findById(stored.user);
  if (!user || user.status === "suspended") throw ApiError.unauthorized();

  res.cookie(ACCESS_COOKIE, signAccessToken({ sub: user._id.toString(), role: user.role }), accessCookieOptions);
  res.status(204).end();
}

// GET /api/auth/me — frontend: lib/auth/get-current-user.ts (the session seam)
async function getMe(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) throw ApiError.notFound();
  // A suspended person's access token lives on for up to 15 minutes; this is
  // what the frontend asks on every page, so it sees them as signed out at once.
  if (user.status === "suspended") throw ApiError.unauthorized("This account has been suspended.");
  res.json(toSafeUser(user));
}

module.exports = { signUp, signIn, googleSignIn, signOut, refresh, getMe };
