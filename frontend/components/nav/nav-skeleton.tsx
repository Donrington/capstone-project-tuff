import { Skeleton } from "@/components/ui/Skeleton";
import { NAV_ITEMS } from "@/lib/nav/items";
import styles from "./nav.module.css";

/**
 * Stand-in for NavBody while the session loads: the signed-in layout, drawn
 * in the same boxes (log button, the main links, the About link, Pro, the
 * profile block), so nothing moves when the real thing streams in. The rail's
 * data-state shapes it, exactly as it shapes the real rows.
 */
export function NavSkeleton() {
  return (
    <div className={styles.skeleton} aria-busy="true">
      <span className="sr-only">Loading navigation</span>
      <div className={styles.skelRow}>
        <Skeleton height={48} radius="var(--radius-full)" />
      </div>
      <div className={styles.navList}>
        <div className={styles.list}>
          {NAV_ITEMS.map((item) => (
            <SkeletonLink key={item.href} />
          ))}
        </div>
        <div className={`${styles.list} ${styles.secondary}`}>
          <SkeletonLink />
        </div>
      </div>
      <div className={styles.bottom}>
        <SkeletonLink />
        <div className={styles.skelProfile}>
          <Skeleton width={32} height={32} radius="50%" />
          <span className={styles.skelProfileText}>
            <Skeleton width="72%" height={11} />
            <Skeleton width="90%" height={9} />
          </span>
        </div>
      </div>
    </div>
  );
}

function SkeletonLink() {
  return (
    <div className={styles.skelLink}>
      <Skeleton width={20} height={20} radius="7px" />
      <span className={styles.skelLabel}>
        <Skeleton width="62%" height={11} />
      </span>
    </div>
  );
}
