import { Skeleton } from "@/components/ui/Skeleton";
import styles from "./loading.module.css";

/** Any app page while its data loads: a header and a grid of tiles. */
export default function AppLoading() {
  return (
    <div className={styles.wrap} aria-busy="true">
      <span className="sr-only" role="status">
        Loading
      </span>
      <div className={styles.header}>
        <Skeleton width={90} height={12} />
        <Skeleton width="min(420px, 70%)" height={40} radius="var(--radius-md)" />
      </div>
      <div className={styles.grid}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} height={180} radius="var(--radius-xl)" />
        ))}
      </div>
    </div>
  );
}
