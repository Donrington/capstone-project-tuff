import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import { headers } from "next/headers";
import { THEME_INIT_SCRIPT } from "@/components/theme/ThemeProvider";
import { siteConfig } from "@/lib/site-config";
import { siteUrl } from "@/lib/site-url";
import { Providers } from "./providers";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-display",
  display: "swap",
});

const DESCRIPTION =
  "TUFF turns training into a team sport. Log your reps, steps and holds, keep your streak alive, and climb the leaderboard with your team.";

// The icons, the share image (opengraph-image.png, twitter-image.png) and the
// web manifest come from the files beside this one; see scripts/brand-assets.mjs.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${siteConfig.name} — ${siteConfig.tagline}`, template: "%s · TUFF" },
  description: DESCRIPTION,
  applicationName: siteConfig.name,
  keywords: ["team fitness", "fitness challenges", "step challenge", "workout streaks", "fitness leaderboard", "TUFF"],
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: DESCRIPTION,
  },
  appleWebApp: { title: siteConfig.name },
};

export const viewport: Viewport = {
  // The dark value; ThemeProvider swaps it when the theme changes.
  themeColor: "#0b0b0d",
  colorScheme: "dark light",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Set by proxy.ts on every request, one value per request — lets this one
  // inline script run under a CSP that otherwise blocks inline scripts.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    // data-theme may be changed by the head script before hydration.
    <html lang="en" data-theme="dark" className={bricolage.variable} suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* Body text font (#22) — preloaded so text doesn't swap late. */}
        <link rel="preload" href="/fonts/Satoshi-Variable.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
