import { redirect } from "next/navigation";
import { ACCESS_COOKIE, API_URL, REFRESH_COOKIE } from "./config";
import { applySessionCookies, parseSetCookie, sessionCookieHeader } from "./cookies";
import { cookies } from "next/headers";

/** A non-2xx answer from the backend, shaped like its errorHandler output. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: Record<string, string>,
  ) {
    super(message);
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Copy any session cookies the backend sets onto Next's response
   *  (sign-in, sign-up, password change, sign-out). */
  session?: boolean;
  /** Return null on 401 instead of sending you to sign in — for the
   *  session check itself. */
  allowUnauthenticated?: boolean;
}

/** One silent refresh per request, shared by every call that needs it. */
async function refreshAccessToken(): Promise<string | null> {
  const refresh = (await cookies()).get(REFRESH_COOKIE)?.value;
  if (!refresh) return null;
  const res = await fetch(`${API_URL}/api/auth/refresh`, {
    method: "POST",
    headers: { cookie: `${REFRESH_COOKIE}=${encodeURIComponent(refresh)}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  await applySessionCookies(res);
  const access = res.headers
    .getSetCookie()
    .map(parseSetCookie)
    .find((c) => c.name === ACCESS_COOKIE);
  return access?.value ?? null;
}

async function send(path: string, options: RequestOptions, accessOverride?: string) {
  const headers: Record<string, string> = {
    cookie: await sessionCookieHeader(accessOverride ? { [ACCESS_COOKIE]: accessOverride } : {}),
  };
  if (options.body !== undefined) headers["content-type"] = "application/json";
  return fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  });
}

/**
 * Calls the backend from the server, forwarding the session cookies. An
 * expired access token is refreshed once and the call retried. If there's
 * still no session, you're sent to sign in (or get `null`, with
 * `allowUnauthenticated`).
 */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let res = await send(path, options);

  if (res.status === 401 && !path.startsWith("/api/auth/sign")) {
    const fresh = await refreshAccessToken();
    if (fresh) res = await send(path, options, fresh);
  }

  if (options.session) await applySessionCookies(res);

  if (res.status === 401 && !path.startsWith("/api/auth/sign")) {
    if (options.allowUnauthenticated) return null as T;
    redirect("/?mode=signin");
  }

  if (!res.ok) {
    let message = "Something went wrong.";
    let details: Record<string, string> | undefined;
    try {
      const body = await res.json();
      message = body?.error?.message ?? message;
      details = body?.error?.details;
    } catch {
      // not JSON — keep the generic message
    }
    throw new ApiError(res.status, message, details);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Like `api`, but a 404 (an endpoint or record that isn't there yet)
 *  comes back as `null` rather than an error. */
export async function apiOptional<T>(path: string): Promise<T | null> {
  try {
    return await api<T>(path);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/** Mongo ObjectIds are 24 hex characters; anything else can't exist, so
 *  don't ask the backend (it would answer 500 for a malformed id). */
export const isObjectId = (id: string) => /^[a-f\d]{24}$/i.test(id);
