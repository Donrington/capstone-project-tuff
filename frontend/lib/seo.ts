import type { Metadata } from "next";

const SHARE_IMAGE_ALT = "TUFF — team fitness challenges, streaks, and leaderboards.";

/**
 * A public page's metadata. A page that sets `openGraph` or `twitter`
 * replaces the root layout's wholesale — including the share image Next
 * attaches from app/opengraph-image.png — so each public page states its own
 * title, description, URL and image here, and gets a canonical link alongside.
 */
export function publicPage({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  /** The page's path, e.g. "/about". Resolved against metadataBase. */
  path: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: "TUFF",
      title,
      description,
      url: path,
      images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: SHARE_IMAGE_ALT }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/twitter-image.png"] },
  };
}

/** For pages that sit behind a sign-in or are single-use: keep them out of search. */
export const noIndex: Metadata = { robots: { index: false, follow: false } };
