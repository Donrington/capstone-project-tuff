import { cookies } from "next/headers";
import { safeNext } from "./safe-next";

/**
 * Carries an invite destination across the hops that lose form state: email
 * sign-up → onboarding and Google → callback → (maybe) onboarding. The cookie
 * is revalidated on every read, so a stale or hand-edited value can never turn
 * into an off-site redirect.
 */
export const NEXT_COOKIE = "tuff_next";
const MAX_AGE = 60 * 60; // one hour

function options() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  };
}

/** Returns the validated path so callers can redirect immediately if needed. */
export async function setNextCookie(value: unknown): Promise<string | null> {
  const next = safeNext(value);
  if (!next) return null;
  (await cookies()).set(NEXT_COOKIE, next, options());
  return next;
}

export async function getNextCookie(): Promise<string | null> {
  return safeNext((await cookies()).get(NEXT_COOKIE)?.value);
}

export async function clearNextCookie(): Promise<void> {
  (await cookies()).delete({ name: NEXT_COOKIE, path: "/" });
}
