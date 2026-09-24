import {
  Info,
  LayoutDashboard,
  Medal,
  Trophy,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { SessionRole } from "@/lib/auth/get-current-user";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** "prefix" also lights up for child routes, e.g. /challenges/new. */
  match: "exact" | "prefix";
  requiresAuth?: boolean;
  /** Only these roles see the link. It hides links; it never grants access. */
  roles?: SessionRole[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, match: "exact", requiresAuth: true },
  { href: "/challenges", label: "Challenges", icon: Trophy, match: "prefix", requiresAuth: true },
  { href: "/leaderboard", label: "Leaderboard", icon: Medal, match: "prefix", requiresAuth: true },
  { href: "/teams", label: "Teams", icon: UsersRound, match: "prefix", requiresAuth: true },
  { href: "/profile", label: "Profile", icon: UserRound, match: "prefix", requiresAuth: true },
];

/** Below the main list and quieter — it leaves the app for the About page. */
export const SECONDARY_NAV_ITEMS: NavItem[] = [
  { href: "/about?from=app", label: "About TUFF", icon: Info, match: "prefix" },
];

/** The site footer's four links, taken from the nav so labels stay in step. */
export const FOOTER_ITEMS: Pick<NavItem, "href" | "label">[] = [
  ...["/dashboard", "/challenges", "/leaderboard", "/teams"].map((href) => {
    const item = NAV_ITEMS.find((i) => i.href === href)!;
    return { href: item.href, label: item.label };
  }),
];

export function isActive(pathname: string, item: NavItem) {
  const path = item.href.split("?")[0];
  if (item.match === "exact") return pathname === path;
  return pathname === path || pathname.startsWith(`${path}/`);
}

/** What a visitor sees: signed-out hides requiresAuth items, roles narrow further. */
export function visibleItems(items: NavItem[], signedIn: boolean, role: SessionRole | null) {
  return items.filter((item) => {
    if (item.requiresAuth && !signedIn) return false;
    if (item.roles && (!role || !item.roles.includes(role))) return false;
    return true;
  });
}
