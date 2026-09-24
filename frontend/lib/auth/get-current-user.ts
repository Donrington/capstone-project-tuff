import { cache } from "react";
import { cookies } from "next/headers";
import { getCurrentUser as getProfileRecord } from "@/lib/data";

export type SessionRole = "member" | "captain" | "admin";

/** The minimal, serializable user the UI gets. Nothing sensitive. */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: SessionRole;
}

/** Mock only: set by sign-out, cleared by sign-in and sign-up. */
export const MOCK_SESSION_COOKIE = "tuff-mock-session";
/** Mock only, never in production: delays the session read so the loading
 *  skeleton can be seen and tested. */
export const MOCK_LATENCY_COOKIE = "tuff-mock-latency";

/**
 * The single session seam. Everything that needs to know who's signed in
 * asks here, so swapping the mock for real auth changes this file only.
 *
 * Mock rules: MOCK_SESSION=signed-in or signed-out forces a state (demos,
 * tests). Otherwise you're signed in until you sign out.
 */
// TODO(auth): replace the body with the real session, verified on the server.
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();

  if (process.env.NODE_ENV !== "production") {
    const delay = Number(jar.get(MOCK_LATENCY_COOKIE)?.value ?? 0);
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 10_000)));
  }

  const forced = process.env.MOCK_SESSION;
  if (forced === "signed-out") return null;
  if (forced !== "signed-in" && jar.get(MOCK_SESSION_COOKIE)?.value === "signed-out") return null;

  const user = await getProfileRecord();
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.photoUrl ?? null,
    role: "member",
  };
});
