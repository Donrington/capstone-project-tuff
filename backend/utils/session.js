const RefreshToken = require("../models/RefreshToken");
const ApiError = require("./ApiError");
const {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOptions,
  refreshCookieOptions,
  signAccessToken,
  generateRefreshToken,
} = require("./jwt");

/** Signs an access token + issues a refresh token, storing the refresh
 *  token's hash (not the plaintext) in RefreshToken, and sets both cookies. */
async function issueSession(res, user) {
  // Every way in goes through here: password sign-in, sign-up and Google.
  if (user.status === "suspended") throw ApiError.forbidden("This account has been suspended.");
  res.cookie(ACCESS_COOKIE, signAccessToken({ sub: user._id.toString(), role: user.role }), accessCookieOptions);

  const { token, hash, expiresAt } = generateRefreshToken();
  await RefreshToken.create({ user: user._id, token: hash, expiresAt });
  res.cookie(REFRESH_COOKIE, token, refreshCookieOptions);
}

function clearSession(res) {
  res.clearCookie(ACCESS_COOKIE, { path: "/" });
  res.clearCookie(REFRESH_COOKIE, { path: "/" });
}

module.exports = { issueSession, clearSession };
