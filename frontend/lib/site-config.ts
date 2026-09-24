/**
 * Brand and contact details, in one place for the footer and anything else
 * that needs them.
 *
 * TODO(brand): these are placeholders. The email uses the reserved .example
 * domain and the phone number is deliberately invalid, so neither can reach
 * a real person, and the socials point at each platform's home page rather
 * than guessing at a handle someone else may own. Swap in the real ones
 * before launch.
 */
export const siteConfig = {
  name: "TUFF",
  tagline: "Team fitness challenges, streaks, and leaderboards.",
  email: "hello@tuff.example",
  phone: { display: "+234 000 000 0000", href: "tel:+2340000000000" },
  location: { city: "Lagos", region: "LA", country: "Nigeria" },
  socials: [
    { id: "whatsapp", label: "WhatsApp", href: "https://www.whatsapp.com/" },
    { id: "instagram", label: "Instagram", href: "https://www.instagram.com/" },
    { id: "tiktok", label: "TikTok", href: "https://www.tiktok.com/" },
    { id: "x", label: "X", href: "https://x.com/" },
  ],
} as const;

export type SocialId = (typeof siteConfig.socials)[number]["id"];
