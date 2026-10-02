import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import { THEME_INIT_SCRIPT } from "@/components/theme/ThemeProvider";
import { Providers } from "./providers";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "TUFF", template: "%s · TUFF" },
  description: "Team fitness challenges, streaks, and leaderboards.",
};

export const viewport: Viewport = {
  // The dark value; ThemeProvider swaps it when the theme changes.
  themeColor: "#0b0b0d",
  colorScheme: "dark light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // data-theme may be changed by the head script before hydration.
    <html lang="en" data-theme="dark" className={bricolage.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* Body text font (#22) — preloaded so text doesn't swap late. */}
        <link rel="preload" href="/fonts/Satoshi-Variable.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
