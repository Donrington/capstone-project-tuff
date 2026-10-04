/**
 * The public origin, for absolute URLs in link previews, the sitemap and the
 * canonical tags. Set NEXT_PUBLIC_SITE_URL once there's a custom domain; until
 * then Vercel's own production hostname is used (it exposes it to builds), and
 * a local run falls back to localhost.
 */
const FALLBACK_PRODUCTION = "https://capstone-project-tuff.vercel.app";

function resolve(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return process.env.NODE_ENV === "production" ? FALLBACK_PRODUCTION : "http://localhost:3000";
}

export const siteUrl = resolve().replace(/\/+$/, "");
