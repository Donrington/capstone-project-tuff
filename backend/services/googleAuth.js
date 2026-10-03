const { OAuth2Client } = require("google-auth-library");
const ApiError = require("../utils/ApiError");

const TOKEN_URL = "https://oauth2.googleapis.com/token";

const isConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

let client;
const verifier = () => (client ??= new OAuth2Client(process.env.GOOGLE_CLIENT_ID));

/**
 * Trades the authorization code the frontend's callback received for
 * Google's ID token, then verifies it (signature, issuer, audience, expiry)
 * with Google's own library. Returns the verified claims.
 */
async function verifyGoogleCode({ code, codeVerifier, redirectUri }) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type: "authorization_code",
    }),
  });
  const tokens = await res.json().catch(() => ({}));
  if (!res.ok || !tokens.id_token) {
    console.error("Google token exchange failed:", res.status, tokens.error, tokens.error_description);
    throw ApiError.badRequest("Google sign-in didn't go through. Try again.");
  }

  const ticket = await verifier().verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID });
  return ticket.getPayload();
}

module.exports = { isConfigured, verifyGoogleCode };
