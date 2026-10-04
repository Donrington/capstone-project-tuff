import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

/** Everything behind a sign-in (and the auth plumbing) is off limits; the
 *  landing page, About and the legal pages are open. Keep in step with
 *  APP_PREFIXES in proxy.ts. */
const PRIVATE = [
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
  "/forgot-password",
  "/reset-password",
  "/auth/",
  "/dev",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: PRIVATE }],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
