import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

/** The public pages. Everything else needs an account. */
const PAGES: { path: string; priority: number }[] = [
  { path: "/", priority: 1 },
  { path: "/about", priority: 0.8 },
  { path: "/privacy", priority: 0.3 },
  { path: "/terms", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map(({ path, priority }) => ({
    url: `${siteUrl}${path === "/" ? "" : path}`,
    changeFrequency: "monthly",
    priority,
  }));
}
