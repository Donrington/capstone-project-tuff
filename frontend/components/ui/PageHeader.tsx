import type { ReactNode } from "react";
import { HeaderUtilities } from "@/components/shell/HeaderUtilities";
import styles from "./PageHeader.module.css";

interface PageHeaderProps {
  kicker?: string;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

/**
 * Every (app) page's header. Renders search and the bell (HeaderUtilities)
 * after any page-specific `actions`, so they're in the same spot everywhere
 * rather than something each page wires up.
 */
export function PageHeader({ kicker, title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.text}>
        {kicker && <p className={styles.kicker}>{kicker}</p>}
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      <div className={styles.actions}>
        {actions}
        <HeaderUtilities />
      </div>
    </header>
  );
}
