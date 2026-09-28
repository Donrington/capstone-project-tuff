import type { ReactNode } from "react";
import { NotificationBell } from "@/components/shell/NotificationBell";
import { getNotifications } from "@/lib/data";
import styles from "./PageHeader.module.css";

interface PageHeaderProps {
  kicker?: string;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

/**
 * Every (app) page's header. Fetches notifications itself and renders the
 * bell after any page-specific `actions`, so it's the same trigger in the
 * same spot everywhere rather than something each page wires up.
 */
export async function PageHeader({ kicker, title, subtitle, actions }: PageHeaderProps) {
  const entries = await getNotifications();
  const now = new Date().toISOString();

  return (
    <header className={styles.header}>
      <div className={styles.text}>
        {kicker && <p className={styles.kicker}>{kicker}</p>}
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      <div className={styles.actions}>
        {actions}
        <NotificationBell entries={entries} now={now} />
      </div>
    </header>
  );
}
