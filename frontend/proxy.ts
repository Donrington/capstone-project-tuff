import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs before every page (Next 16's "proxy", formerly middleware). With the
 * real backend it does three jobs; with mock data it only does the third.
 *
 * 1. Keeps the session alive. The access cookie lasts 15 minutes; when it's
 *    gone but the 30-day refresh cookie is still here, swap it for a new
 *    access token before the page renders (pages can't set cookies, so this
 *    is the one place that can). The new token goes on the response for the
 *    browser and on the request so this very render already uses it.
 * 2. Guards the app. No session on an app page → sign in. A session on the
 *    sign-in page → the dashboard.
 * 3. Sets the response's security headers (CSP, HSTS, frame/sniff/referrer/
 *    permissions policy) on every response this function returns, keyed to
 *    one nonce per request — the only inline script on the page (the theme
 *    init script in app/layout.tsx) carries that same nonce via the
 *    x-nonce request header, so script-src can drop 'unsafe-inline'.
 *
 * It's an optimistic check, not the security boundary: the backend still
 * verifies every request.
 */

const ACCESS_COOKIE = "tuff_access";
const REFRESH_COOKIE = "tuff_refresh";
const API_URL = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");
const USE_MOCK = process.env.TUFF_DATA_SOURCE === "mock";

const APP_PREFIXES = [
  "/dashboard",
  "/challenges",
  "/exercises",
  "/leaderboard",
  "/teams",
  "/profile",
  "/settings",
  "/search",
  "/join",
  "/onboarding",
  "/admin",
];

const isAppRoute = (path: string) => APP_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

function toSignIn(request: NextRequest) {
  const url = new URL("/", request.url);
  url.searchParams.set("mode", "signin");
  const response = NextResponse.redirect(url);
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
  return response;
}

async function refreshAccess(refresh: string): Promise<{ value: string; maxAge: number } | null> {
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { cookie: `${REFRESH_COOKIE}=${encodeURIComponent(refresh)}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    for (const header of res.headers.getSetCookie()) {
      const [pair, ...attrs] = header.split(";");
      const eq = pair.indexOf("=");
      if (pair.slice(0, eq).trim() !== ACCESS_COOKIE) continue;
      const maxAgeAttr = attrs.map((a) => a.trim()).find((a) => a.toLowerCase().startsWith("max-age="));
      return {
        value: decodeURIComponent(pair.slice(eq + 1).trim()),
        maxAge: maxAgeAttr ? Number(maxAgeAttr.split("=")[1]) : 15 * 60,
      };
    }
    return null;
  } catch {
    return null; // backend unreachable: treat as signed out
  }
}

export async function proxy(request: NextRequest) {
  const requestNonce = nonce();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", requestNonce);
  const next = () => NextResponse.next({ request: { headers: requestHeaders } });
  const done = (response: NextResponse) => withSecurityHeaders(response, requestNonce);

  if (USE_MOCK) return done(next());

  const path = request.nextUrl.pathname;
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  const onAuthPage = path === "/";

  if (!isAppRoute(path) && !onAuthPage) return done(next());

  if (access) {
    return done(onAuthPage ? NextResponse.redirect(new URL("/dashboard", request.url)) : next());
  }

  if (!refresh) return done(onAuthPage ? next() : toSignIn(request));

  const fresh = await refreshAccess(refresh);
  if (!fresh) return done(onAuthPage ? next() : toSignIn(request));

  if (onAuthPage) {
    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    response.cookies.set(ACCESS_COOKIE, fresh.value, cookieOptions(fresh.maxAge));
    return done(response);
  }

  // Hand the new token to this render too, not just the browser.
  request.cookies.set(ACCESS_COOKIE, fresh.value);
  const refreshedHeaders = new Headers(request.headers);
  refreshedHeaders.set("x-nonce", requestNonce);
  const response = NextResponse.next({ request: { headers: refreshedHeaders } });
  response.cookies.set(ACCESS_COOKIE, fresh.value, cookieOptions(fresh.maxAge));
  return done(response);
}

function nonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/** Only what the app actually loads: self-hosted fonts and scripts, Cloudinary
 *  for profile photos, data: URLs for the client-side photo preview before
 *  upload. No inline/remote script or style host needs listing beyond that —
 *  see the proxy.ts audit in git history for how this was checked. */
function csp(nonceValue: string) {
  // Next's dev-mode HMR client eval()s its patches; production never does.
  const dev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonceValue}' 'strict-dynamic' https:${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://res.cloudinary.com",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

function withSecurityHeaders(response: NextResponse, nonceValue: string) {
  response.headers.set("Content-Security-Policy", csp(nonceValue));
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  return response;
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export const config = {
  // Pages only — not Next's assets, the media, fonts or the logo.
  matcher: ["/((?!_next/|media/|fonts/|logo/|favicon.ico|.*\\.(?:png|jpg|svg|mp4|woff2)$).*)"],
};
