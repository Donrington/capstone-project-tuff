import { Skeleton } from "@/components/ui/Skeleton";
import styles from "../loading.module.css";

/** The dashboard while it loads, in the bento's shape so nothing jumps. */
export default function DashboardLoading() {
  const tile = (className: string, height: number) => (
    <Skeleton className={className} height={height} radius="var(--radius-xl)" />
  );
  return (
    <div className={styles.wrap} aria-busy="true">
      <span className="sr-only" role="status">
        Loading your dashboard
      </span>
      <div className={styles.header}>
        <Skeleton width={90} height={12} />
        <Skeleton width="min(460px, 75%)" height={44} radius="var(--radius-md)" />
        <Skeleton width="min(380px, 60%)" height={16} />
      </div>
      <div className={styles.bento}>
        {tile(styles.ring, 340)}
        {tile(styles.feat, 340)}
        {tile(styles.week, 300)}
        {tile(styles.lead, 460)}
        {tile(styles.chal, 140)}
        {tile(styles.team, 220)}
      </div>
    </div>
  );
}
