"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { api, ApiError } from "@/lib/api/client";
import { GOOGLE_OAUTH_COOKIE, GOOGLE_OAUTH_PATH, googleRedirectUri } from "@/lib/auth/google";
import { clearNextCookie, getNextCookie, setNextCookie } from "@/lib/auth/next-cookie";

interface CallbackQuery {
  code?: string;
  state?: string;
  error?: string;
}

interface GoogleSignInResult {
  user: { id: string };
  isNew: boolean;
}

function fail(flash = "google-failed"): never {
  redirect(`/?mode=signin&flash=${flash}`);
}

/** Swaps Google's one-time code for a TUFF session, then sends the person on. */
export async function completeGoogleSignIn(query: CallbackQuery): Promise<void> {
  const jar = await cookies();
  const stored = jar.get(GOOGLE_OAUTH_COOKIE)?.value;
  // Same path it was set with in ../route.ts, or the browser keeps it.
  jar.delete({ name: GOOGLE_OAUTH_COOKIE, path: GOOGLE_OAUTH_PATH });

  // The redirect URI has to match the one the start route sent Google. Read
  // the origin from this action's own request — Next rejects server actions
  // whose Origin doesn't match the host — never from a value the client passes.
  const origin = (await headers()).get("origin") ?? "";

  if (query.error === "access_denied") redirect("/?mode=signin");
  if (!query.code || !query.state || !stored || !origin) fail();

  const [state, verifier] = stored.split(".");
  if (!state || !verifier || state !== query.state) fail();

  let result: GoogleSignInResult;
  try {
    result = await api<GoogleSignInResult>("/api/auth/google", {
      method: "POST",
      session: true,
      body: {
        code: query.code,
        codeVerifier: verifier,
        redirectUri: googleRedirectUri(origin),
      },
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 503) fail("google-unavailable");
    fail();
  }

  // Only the cookie set by the start route counts: Google's redirect never
  // carries our query string, so a `next` on this URL could only be crafted.
  const next = await getNextCookie();

  if (result.isNew) {
    // Keep the invite for onboarding's final redirect.
    if (next) await setNextCookie(next);
    redirect("/onboarding");
  }

  // Existing member: nothing left to carry, so don't leave the cookie behind.
  await clearNextCookie();
  redirect(next ?? "/dashboard");
}
