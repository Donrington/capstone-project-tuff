import type { Metadata } from "next";
import { headers } from "next/headers";
import { AuthSplit, type AuthMode } from "./AuthSplit";
import { siteConfig } from "@/lib/site-config";
import { siteUrl } from "@/lib/site-url";

// Title, description and share card come from the root layout. The sign-in
// variant (?mode=signin) is the same page as far as search is concerned.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: siteConfig.name,
      url: siteUrl,
      logo: `${siteUrl}/icons/icon-512.png`,
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: siteConfig.name,
      url: siteUrl,
      description: siteConfig.tagline,
      publisher: { "@id": `${siteUrl}/#organization` },
    },
  ],
};

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  const initialMode: AuthMode = mode === "signin" ? "signin" : "signup";
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        // Static, built here from our own config, so nothing user-supplied reaches the markup.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA).replace(/</g, "\\u003c") }}
      />
      <AuthSplit initialMode={initialMode} />
    </>
  );
}
