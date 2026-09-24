import type { ReactNode } from "react";
import { ActivityBell } from "@/components/shell/ActivityBell";
import { getActivityFeed } from "@/lib/data";
import styles from "./PageHeader.module.css";

interface PageHeaderProps {
  kicker?: string;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

/**
 * Every (app) page's header. Fetches the activity feed itself and renders
 * the bell after any page-specific `actions`, so it's the same trigger in
 * the same spot everywhere rather than something each page wires up.
 */
export async function PageHeader({ kicker, title, subtitle, actions }: PageHeaderProps) {
  const { entries, seenAt } = await getActivityFeed();
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
        <ActivityBell entries={entries} seenAt={seenAt} now={now} />
      </div>
    </header>
  );
}
