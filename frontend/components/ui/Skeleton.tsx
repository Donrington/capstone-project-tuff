import type { CSSProperties } from "react";
import styles from "./Skeleton.module.css";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  /** Any radius token value, e.g. `var(--radius-xl)`. Defaults to a pill. */
  radius?: string;
  className?: string;
}

/**
 * Placeholder block for loading screens (#8). Decorative, so it's hidden from
 * screen readers — the surrounding `loading.tsx` announces the wait.
 */
export function Skeleton({ width, height = 16, radius, className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={[styles.skeleton, className].filter(Boolean).join(" ")}
      style={{ width, height, borderRadius: radius } as CSSProperties}
    />
  );
}
