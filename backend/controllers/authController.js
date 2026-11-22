const bcrypt = require("bcryptjs");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const ApiError = require("../utils/ApiError");
const {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOptions,
  refreshCookieOptions,
  signAccessToken,
  hashRefreshToken,
  generateRefreshToken,
} = require("../utils/jwt");
const { toSafeUser, toSelfUser } = require("../utils/serializeUser");
const { issueSession, clearSession } = require("../utils/session");
const googleAuth = require("../services/googleAuth");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/; // matches frontend/app/(auth)/actions.ts exactly
const BCRYPT_COST = 12;
// A real cost-12 hash for a password nobody can sign in with. Unknown emails
// pay the same bcrypt cost as known ones, so timing can't enumerate accounts.
const DUMMY_HASH = "$2a$12$i0NAQeYIDfD0/AjXG/aCv.3y7k7ecxWE5xiHigjiwqFECBnV52m/m";

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

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
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
  // Google-only accounts have no hash to compare, so they take the dummy path
  // as well; their distinct message is fine (sign-up already reveals the email).
  const hash = user?.passwordHash || DUMMY_HASH;
  const ok = await bcrypt.compare(password, hash);

  if (!user) throw ApiError.unauthorized(WRONG);
  if (!user.passwordHash) throw ApiError.unauthorized("That account signs in with Google. Use Continue with Google instead.");
  if (!ok) throw ApiError.unauthorized(WRONG);

  // Hashes from before the cost increase are upgraded on the one occasion we
  // know the plaintext, instead of locking their owners out or resetting them.
  if (bcrypt.getRounds(user.passwordHash) < BCRYPT_COST) {
    user.passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    await user.save();
  }

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
    // Keep the row but mark it revoked: a stolen copy replayed later must
    // still trip reuse detection and revoke the rest of the family.
    await RefreshToken.updateOne(
      { token: hashRefreshToken(refreshToken), revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
  }
  clearSession(res);
  res.status(204).end();
}

// POST /api/auth/refresh — the access token is short-lived (15m); the
// frontend calls this when a request comes back 401 to get a new one
// silently. Every call exchanges the presented refresh token for a new one,
// so a stolen token can only be used once. Presenting a used one means the
// cookie leaked (or the owner replayed it), so the whole family is revoked.
const SESSION_EXPIRED = "Your session expired. Sign in again.";

async function refresh(req, res) {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  if (!refreshToken) throw ApiError.unauthorized();

  const stored = await RefreshToken.findOne({ token: hashRefreshToken(refreshToken) });
  if (!stored) throw ApiError.unauthorized(SESSION_EXPIRED);

  if (stored.revokedAt) {
    await RefreshToken.updateMany({ user: stored.user, revokedAt: null }, { $set: { revokedAt: new Date() } });
    clearSession(res);
    throw ApiError.unauthorized(SESSION_EXPIRED);
  }
  if (stored.expiresAt < new Date()) throw ApiError.unauthorized(SESSION_EXPIRED);

  const user = await User.findById(stored.user);
  if (!user || user.status === "suspended") throw ApiError.unauthorized();

  const { token, hash, expiresAt } = generateRefreshToken();
  const replacement = await RefreshToken.create({ user: stored.user, token: hash, expiresAt });
  // Compare-and-set on revokedAt: if two requests present the same token at
  // once, only one can win. The loser is the replay, not a second refresh.
  const rotated = await RefreshToken.updateOne(
    { _id: stored._id, revokedAt: null },
    { $set: { revokedAt: new Date(), replacedBy: replacement._id } },
  );
  if (!rotated?.modifiedCount) {
    await RefreshToken.updateMany({ user: stored.user, revokedAt: null }, { $set: { revokedAt: new Date() } });
    await RefreshToken.deleteOne({ _id: replacement._id });
    clearSession(res);
    throw ApiError.unauthorized(SESSION_EXPIRED);
  }

  res.cookie(ACCESS_COOKIE, signAccessToken({ sub: user._id.toString(), role: user.role }), accessCookieOptions);
  res.cookie(REFRESH_COOKIE, token, refreshCookieOptions);
  res.status(204).end();
}

// GET /api/auth/me — frontend: lib/auth/get-current-user.ts (the session seam)
async function getMe(req, res) {
  const user = await User.findById(req.user.id).select("+passwordHash");
  if (!user) throw ApiError.notFound();
  // A suspended person's access token lives on for up to 15 minutes; this is
  // what the frontend asks on every page, so it sees them as signed out at once.
  if (user.status === "suspended") throw ApiError.unauthorized("This account has been suspended.");
  // The owner's /me response carries the private timezone preference.
  res.json(toSelfUser(user));
}

module.exports = { signUp, signIn, googleSignIn, signOut, refresh, getMe };
