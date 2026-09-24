import Link from "next/link";
import { formatCount } from "@/lib/challenge-card";
import { relativeTime } from "@/lib/time";
import type { ActivityFeedEntry } from "@/lib/types";
import styles from "./RecentActivityList.module.css";

/** `now` is a fixed snapshot from the page, not computed here — see lib/time.ts. */
export function RecentActivityList({
  entries,
  now,
}: {
  entries: ActivityFeedEntry[];
  now: string;
}) {
  return (
    <section className={styles.section} aria-labelledby="recent-heading">
      <h2 id="recent-heading" className={styles.heading}>
        Recent activity
      </h2>
      {entries.length === 0 ? (
        <p className={styles.empty}>No activity yet. Log something to get it started.</p>
      ) : (
        <ul className={styles.list}>
          {entries.map((entry) => (
            <li key={entry.id}>
              <Link href={`/challenges/${entry.challengeId}`} className={styles.row}>
                <span className={styles.text}>
                  Logged <strong>{formatCount(entry.value)}</strong> {entry.unit} to{" "}
                  {entry.challengeName}
                </span>
                <span className={styles.time}>{relativeTime(entry.loggedAt, now)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
