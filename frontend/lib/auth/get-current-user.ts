import { cache } from "react";
import { cookies } from "next/headers";
import { api } from "@/lib/api/client";
import { DATA_SOURCE, MOCK_ROLE_COOKIE } from "@/lib/api/config";
import { hasSession } from "@/lib/api/cookies";
import { getCurrentUser as getProfileRecord } from "@/lib/data";

export type SessionRole = "member" | "admin";

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

interface MeResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePicture: string | null;
  role: SessionRole;
}

/**
 * The single session seam. Everything that needs to know who's signed in
 * asks here.
 *
 * Real (default): GET /api/auth/me with the session cookies — null when
 * there's no valid session. Mock (TUFF_DATA_SOURCE=mock): MOCK_SESSION
 * forces a state, otherwise you're signed in until you sign out.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();

  if (process.env.NODE_ENV !== "production") {
    const delay = Number(jar.get(MOCK_LATENCY_COOKIE)?.value ?? 0);
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 10_000)));
  }

  if (DATA_SOURCE === "api") {
    if (!(await hasSession())) return null;
    const me = await api<MeResponse | null>("/api/auth/me", { allowUnauthenticated: true });
    if (!me) return null;
    return {
      id: me.id,
      name: `${me.firstName} ${me.lastName}`.trim(),
      email: me.email,
      avatarUrl: me.profilePicture ?? null,
      role: me.role,
    };
  }

  const forced = process.env.MOCK_SESSION;
  if (forced === "signed-out") return null;
  if (forced !== "signed-in" && jar.get(MOCK_SESSION_COOKIE)?.value === "signed-out") return null;

  const user = await getProfileRecord();
  return {
    id: user.id,
    // SessionUser stays a single display string on purpose — it's a UI
    // projection, not the stored shape (firstName/lastName live on User).
    name: `${user.firstName} ${user.lastName}`.trim(),
    email: user.email,
    avatarUrl: user.profilePicture ?? null,
    role: jar.get(MOCK_ROLE_COOKIE)?.value === "admin" ? "admin" : "member",
  };
});
