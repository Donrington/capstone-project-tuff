"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ChevronsUpDown, FlaskConical, LogOut, Moon, Settings, Sun, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Menu, type MenuItemSpec } from "@/components/ui/Menu";
import { Tooltip } from "@/components/ui/Tooltip";
import { useTheme } from "@/components/theme/ThemeProvider";
import { signOut, switchPersonaAction } from "@/app/(app)/actions";
import type { Persona } from "@/lib/types";
import { useNavContext } from "./nav-context";
import styles from "./nav.module.css";

export interface NavProfileUser {
  name: string;
  email: string;
  avatarUrl: string | null;
  initials: string;
}

/** The account menu's items — one list, so the rail and the top bar match. */
function useAccountItems(persona: Persona | null): MenuItemSpec[] {
  const { theme, setTheme } = useTheme();
  const items: MenuItemSpec[] = [
    { label: "View profile", icon: UserRound, href: "/profile" },
    { label: "Settings", icon: Settings, href: "/settings" },
    { label: "Dark theme", icon: Moon, checked: theme === "dark", separatorBefore: true, onSelect: () => setTheme("dark") },
    { label: "Light theme", icon: Sun, checked: theme === "light", onSelect: () => setTheme("light") },
  ];
  // Mock data only (#20) — flips every screen between a returning account
  // and a brand-new one. `null` when it isn't available.
  if (persona) {
    items.push({
      label: persona === "new" ? "Switch to returning user" : "Switch to new user",
      icon: FlaskConical,
      separatorBefore: true,
      onSelect: () => {
        void switchPersonaAction(persona === "new" ? "returning" : "new");
      },
    });
  }
  items.push({
    label: "Sign out",
    icon: LogOut,
    danger: true,
    separatorBefore: true,
    onSelect: () => {
      void signOut();
    },
  });
  return items;
}

/**
 * The signed-in profile block. On the rail it opens the account menu —
 * expanded it shows the avatar, name and email; collapsed, just the avatar,
 * with the rest in a tooltip and the button's accessible name. In the
 * small-screen drawer it's a plain link to the profile (the top bar's avatar
 * has the menu there).
 */
export function ProfileMenu({ user, persona }: { user: NavProfileUser; persona: Persona | null }) {
  const { collapsed, inDrawer } = useNavContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const items = useAccountItems(persona);

  const body = (
    <>
      <Avatar initials={user.initials} size="sm" photoUrl={user.avatarUrl} />
      <span className={styles.profileText}>
        <span className={styles.profileName}>{user.name}</span>
        <span className={styles.profileEmail}>{user.email}</span>
      </span>
    </>
  );

  if (inDrawer) {
    return (
      <Link href="/profile" className={styles.profile}>
        {body}
        <ChevronRight size={16} className={styles.profileChevron} aria-hidden="true" />
      </Link>
    );
  }

  return (
    <Tooltip
      enabled={collapsed && !menuOpen}
      label={
        <span className={styles.tipStack}>
          <span>{user.name}</span>
          <span className={styles.tipSub}>{user.email}</span>
        </span>
      }
    >
      <Menu
        items={items}
        label="Account"
        side="right"
        triggerLabel={`Account: ${user.name}, ${user.email}`}
        triggerClassName={styles.profile}
        onOpenChange={setMenuOpen}
        trigger={
          <>
            {body}
            <ChevronsUpDown size={16} className={styles.profileChevron} aria-hidden="true" />
          </>
        }
      />
    </Tooltip>
  );
}

/** The same menu from the small-screen top bar's avatar. */
export function TopBarProfileMenu({ user, persona }: { user: NavProfileUser; persona: Persona | null }) {
  const items = useAccountItems(persona);
  return (
    <Menu
      items={items}
      label="Account"
      align="end"
      triggerLabel={`Account: ${user.name}`}
      triggerClassName={styles.topAvatar}
      trigger={<Avatar initials={user.initials} size="sm" photoUrl={user.avatarUrl} />}
    />
  );
}
