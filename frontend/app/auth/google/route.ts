import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { DATA_SOURCE } from "@/lib/api/config";
import { MOCK_SESSION_COOKIE } from "@/lib/auth/get-current-user";
import { GOOGLE_OAUTH_COOKIE, GOOGLE_OAUTH_PATH, googleClientId, googleRedirectUri, newGoogleAttempt } from "@/lib/auth/google";
import { clearNextCookie, setNextCookie } from "@/lib/auth/next-cookie";
import { PERSONA_COOKIE } from "@/lib/data";

/** "Continue with Google": off to Google's consent screen. */
export async function GET(request: NextRequest) {
  const jar = await cookies();
  // Google's redirect won't carry our query string, so the validated invite
  // destination waits in its own cookie until the callback runs. Clear first
  // so a stale invite from an abandoned attempt can't survive this one.
  await clearNextCookie();
  const next = await setNextCookie(request.nextUrl.searchParams.get("next"));

  if (DATA_SOURCE === "mock") {
    // The demo has no Google; behave like the demo's email sign-in.
    jar.delete(MOCK_SESSION_COOKIE);
    jar.delete(PERSONA_COOKIE);
    redirect(next ?? "/dashboard");
  }

  const clientId = googleClientId();
  if (!clientId) {
    const params = new URLSearchParams({ mode: "signin", flash: "google-unavailable" });
    if (next) params.set("next", next);
    redirect(`/?${params}`);
  }

  const { state, verifier, challenge } = newGoogleAttempt();
  jar.set(GOOGLE_OAUTH_COOKIE, `${state}.${verifier}`, {
    httpOnly: true,
    // Lax still rides along on Google's top-level redirect back to us.
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: GOOGLE_OAUTH_PATH,
    maxAge: 10 * 60,
  });

  const google = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  google.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleRedirectUri(request.nextUrl.origin),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  redirect(google.toString());
}
