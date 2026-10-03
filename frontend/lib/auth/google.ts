import { createHash, randomBytes } from "node:crypto";

/** Holds `state.codeVerifier` between leaving for Google and coming back. */
export const GOOGLE_OAUTH_COOKIE = "tuff_google_oauth";
export const GOOGLE_OAUTH_PATH = "/auth/google";

export const googleClientId = () => process.env.GOOGLE_CLIENT_ID ?? "";

/** Where Google sends people back to. It must be listed, exactly, as an
 *  authorized redirect URI on the OAuth client in Google Cloud Console. */
export const googleRedirectUri = (origin: string) => new URL(`${GOOGLE_OAUTH_PATH}/callback`, origin).toString();

/** A CSRF `state` and a PKCE verifier, plus the challenge Google gets instead
 *  of the verifier itself. All base64url, so the pair fits in one cookie. */
export function newGoogleAttempt() {
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { state, verifier, challenge };
}
