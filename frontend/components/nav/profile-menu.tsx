"use client";

import { useState } from "react";
import { ChevronsUpDown, LogOut, Settings, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Menu, type MenuItemSpec } from "@/components/ui/Menu";
import { Tooltip } from "@/components/ui/Tooltip";
import { signOut } from "@/app/(app)/actions";
import { useNavContext } from "./nav-context";
import styles from "./nav.module.css";

export interface NavProfileUser {
  name: string;
  email: string;
  avatarUrl: string | null;
  initials: string;
}

const ITEMS: MenuItemSpec[] = [
  { label: "Profile", icon: UserRound, href: "/profile" },
  { label: "Settings", icon: Settings, href: "/settings" },
  {
    label: "Sign out",
    icon: LogOut,
    danger: true,
    separatorBefore: true,
    onSelect: () => {
      void signOut();
    },
  },
];

/**
 * The signed-in profile block. Expanded, it shows the avatar, name and
 * email; collapsed, just the avatar, with the name and email in a tooltip
 * and in the button's accessible name. The menu opens beside the rail in the
 * top layer, so the rail's overflow can't clip it.
 */
export function ProfileMenu({ user }: { user: NavProfileUser }) {
  const { collapsed } = useNavContext();
  const [menuOpen, setMenuOpen] = useState(false);

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
        items={ITEMS}
        label="Account"
        side="right"
        triggerLabel={`Account: ${user.name}, ${user.email}`}
        triggerClassName={styles.profile}
        onOpenChange={setMenuOpen}
        trigger={
          <>
            <Avatar initials={user.initials} size="sm" photoUrl={user.avatarUrl} />
            <span className={styles.profileText}>
              <span className={styles.profileName}>{user.name}</span>
              <span className={styles.profileEmail}>{user.email}</span>
            </span>
            <ChevronsUpDown size={16} className={styles.profileChevron} aria-hidden="true" />
          </>
        }
      />
    </Tooltip>
  );
}
