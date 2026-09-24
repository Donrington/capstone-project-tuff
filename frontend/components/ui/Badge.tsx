import type { ReactNode } from "react";
import styles from "./Badge.module.css";

type BadgeVariant = "volt" | "surge" | "success" | "neutral" | "streak";

interface BadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
}

/**
 * Solid-fill pill in one of TUFF's five brand/status colors. `streak` is
 * the one exception to solid fill (surface-2 + status-warning text) so it
 * doesn't stack two "urgency" signals next to a surge chip.
 */
export function Badge({ variant, children }: BadgeProps) {
  return <span className={`${styles.chip} ${styles[variant]}`}>{children}</span>;
}
