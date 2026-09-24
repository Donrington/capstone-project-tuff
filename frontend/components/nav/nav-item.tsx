"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tooltip } from "@/components/ui/Tooltip";
import { isActive, type NavItem as NavItemConfig } from "@/lib/nav/items";
import { useNavContext } from "./nav-context";
import styles from "./nav.module.css";

/**
 * One link in the rail. The label stays in the DOM when collapsed (clipped
 * and faded, never removed), so it's still the link's accessible name; the
 * tooltip only repeats it for sighted users.
 */
export function NavItem({ item, quiet }: { item: NavItemConfig; quiet?: boolean }) {
  const pathname = usePathname();
  const { collapsed } = useNavContext();
  const active = isActive(pathname, item);
  const Icon = item.icon;

  return (
    <li>
      <Tooltip label={item.label} enabled={collapsed}>
        <Link
          href={item.href}
          className={`${styles.link} ${quiet ? styles.quiet : ""}`}
          aria-current={active ? "page" : undefined}
        >
          <Icon size={20} strokeWidth={2} className={styles.icon} aria-hidden="true" />
          <span className={styles.label}>{item.label}</span>
        </Link>
      </Tooltip>
    </li>
  );
}
