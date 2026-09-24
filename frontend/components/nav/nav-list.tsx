"use client";

import type { SessionRole } from "@/lib/auth/get-current-user";
import { NAV_ITEMS, SECONDARY_NAV_ITEMS, visibleItems } from "@/lib/nav/items";
import { NavItem } from "./nav-item";
import styles from "./nav.module.css";

/** The Primary landmark. Takes plain session facts, so the server can decide
 *  who sees what without handing icon components across the boundary. */
export function NavList({ signedIn, role }: { signedIn: boolean; role: SessionRole | null }) {
  const primary = visibleItems(NAV_ITEMS, signedIn, role);
  const secondary = visibleItems(SECONDARY_NAV_ITEMS, signedIn, role);

  return (
    <nav aria-label="Primary" className={styles.navList}>
      {primary.length > 0 && (
        <ul className={styles.list}>
          {primary.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
        </ul>
      )}
      {secondary.length > 0 && (
        <ul className={`${styles.list} ${primary.length > 0 ? styles.secondary : ""}`}>
          {secondary.map((item) => (
            <NavItem key={item.href} item={item} quiet />
          ))}
        </ul>
      )}
    </nav>
  );
}
