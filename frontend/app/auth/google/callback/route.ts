import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { api, ApiError } from "@/lib/api/client";
import { GOOGLE_OAUTH_COOKIE, GOOGLE_OAUTH_PATH, googleRedirectUri } from "@/lib/auth/google";

/**
 * Google sends people back here. Checks the CSRF state, then hands the code
 * (and the PKCE verifier) to the backend, which trades it with Google, signs
 * the person in, and sets the session cookies — copied onto our domain, the
 * same as email sign-in.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const jar = await cookies();
  const [savedState, verifier] = (jar.get(GOOGLE_OAUTH_COOKIE)?.value ?? "").split(".");
  jar.delete({ name: GOOGLE_OAUTH_COOKIE, path: GOOGLE_OAUTH_PATH });

  // They backed out on Google's screen: nothing went wrong, so nothing to say.
  if (params.get("error") === "access_denied") redirect("/?mode=signin");

  const code = params.get("code");
  if (!code || !savedState || !verifier || params.get("state") !== savedState) {
    redirect("/?mode=signin&flash=google-failed");
  }

  let isNew = false;
  try {
    ({ isNew } = await api<{ isNew: boolean }>("/api/auth/google", {
      method: "POST",
      body: { code, codeVerifier: verifier, redirectUri: googleRedirectUri(request.nextUrl.origin) },
      session: true,
    }));
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
    redirect(`/?mode=signin&flash=${err.status === 503 ? "google-unavailable" : "google-failed"}`);
  }
  redirect(isNew ? "/onboarding" : "/dashboard");
}
