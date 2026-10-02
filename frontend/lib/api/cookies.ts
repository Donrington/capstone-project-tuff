import { cookies } from "next/headers";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "./config";

/**
 * The session lives in two httpOnly cookies the backend issues. The browser
 * only ever talks to Next, so Next copies them onto its own domain when the
 * backend sets them, and sends them back on every backend call. That keeps
 * working when the frontend and backend are on different domains in
 * production, where the backend's own cookies would never reach the browser.
 */

const SESSION_COOKIES = new Set([ACCESS_COOKIE, REFRESH_COOKIE]);

export interface ParsedCookie {
  name: string;
  value: string;
  /** Seconds; 0 means delete. */
  maxAge?: number;
}

/** Just the parts of a Set-Cookie header we need. */
export function parseSetCookie(header: string): ParsedCookie {
  const [pair, ...attrs] = header.split(";");
  const eq = pair.indexOf("=");
  const cookie: ParsedCookie = { name: pair.slice(0, eq).trim(), value: decodeURIComponent(pair.slice(eq + 1).trim()) };
  for (const attr of attrs) {
    const [key, val] = attr.trim().split("=");
    if (key.toLowerCase() === "max-age") cookie.maxAge = Number(val);
    if (key.toLowerCase() === "expires" && cookie.maxAge === undefined) {
      const ms = Date.parse(val) - Date.now();
      if (Number.isFinite(ms)) cookie.maxAge = Math.max(0, Math.floor(ms / 1000));
    }
  }
  if (cookie.value === "") cookie.maxAge = 0;
  return cookie;
}

export const sessionCookieOptions = (maxAge?: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge,
});

/**
 * Copies the backend's session cookies onto Next's response. Only works
 * where Next allows setting cookies (server actions, route handlers);
 * during a page render it quietly does nothing, and the proxy picks the
 * refresh up on the next request instead.
 */
export async function applySessionCookies(response: Response) {
  const jar = await cookies();
  for (const header of response.headers.getSetCookie()) {
    const cookie = parseSetCookie(header);
    if (!SESSION_COOKIES.has(cookie.name)) continue;
    try {
      if (cookie.maxAge === 0) jar.delete(cookie.name);
      else jar.set(cookie.name, cookie.value, sessionCookieOptions(cookie.maxAge));
    } catch {
      // Rendering, not an action — can't set cookies here. See above.
    }
  }
}

export async function clearSessionCookies() {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

/** The Cookie header to forward to the backend. */
export async function sessionCookieHeader(overrides: Record<string, string> = {}) {
  const jar = await cookies();
  const values: Record<string, string> = {};
  for (const name of SESSION_COOKIES) {
    const value = overrides[name] ?? jar.get(name)?.value;
    if (value) values[name] = value;
  }
  return Object.entries(values)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("; ");
}

export async function hasSession() {
  const jar = await cookies();
  return jar.has(REFRESH_COOKIE) || jar.has(ACCESS_COOKIE);
}
