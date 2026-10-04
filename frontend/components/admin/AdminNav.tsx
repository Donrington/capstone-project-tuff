"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./admin.module.css";

const SECTIONS = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/users", label: "Members" },
  { href: "/admin/challenges", label: "Challenges" },
  { href: "/admin/teams", label: "Teams" },
];

/** The admin area's section tabs: pills that scroll sideways on a phone. */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className={styles.nav}>
      <ul className={styles.navList}>
        {SECTIONS.map((s) => {
          const current = s.exact ? pathname === s.href : pathname === s.href || pathname.startsWith(`${s.href}/`);
          return (
            <li key={s.href}>
              <Link href={s.href} className={styles.navLink} aria-current={current ? "page" : undefined}>
                {s.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
