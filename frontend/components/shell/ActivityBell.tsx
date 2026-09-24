"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Popover } from "@/components/ui/Popover";
import { formatCount } from "@/lib/challenge-card";
import { relativeTime } from "@/lib/time";
import type { ActivityFeedEntry } from "@/lib/types";
import { markActivityFeedSeen } from "@/app/(app)/actions";
import styles from "./ActivityBell.module.css";

interface ActivityBellProps {
  entries: ActivityFeedEntry[];
  /** Entries at or before this ISO instant count as already seen. */
  seenAt: string;
  /** A fixed snapshot for relative-time text — never computed client-side
   *  from `Date.now()`, which is what caused the hydration mismatch this
   *  replaced. */
  now: string;
}

/**
 * The nav bell: a feed of who's logged what, on every app page (via
 * PageHeader). Opening it clears the unread dot — see markActivityFeedSeen.
 */
export function ActivityBell({ entries, seenAt, now }: ActivityBellProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const marked = useRef(false);

  const unseenCount = entries.filter((e) => !e.isCurrentUser && e.loggedAt > seenAt).length;

  useEffect(() => {
    if (open && unseenCount > 0 && !marked.current) {
      marked.current = true;
      void markActivityFeedSeen();
    }
    if (!open) marked.current = false;
  }, [open, unseenCount]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={unseenCount > 0 ? `Activity, ${unseenCount} new` : "Activity"}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={18} aria-hidden="true" />
        {unseenCount > 0 && <span className={styles.dot} aria-hidden="true" />}
      </button>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={triggerRef}
        align="end"
        className={styles.panel}
        aria-label="Recent activity"
      >
        <div className={styles.head}>Activity</div>
        {entries.length === 0 ? (
          <p className={styles.empty}>Nothing yet. Log something to get it started.</p>
        ) : (
          <ul className={styles.list}>
            {entries.map((entry) => (
              <li key={entry.id}>
                <Link
                  href={`/challenges/${entry.challengeId}`}
                  className={styles.row}
                  onClick={() => setOpen(false)}
                >
                  <span className={styles.avatar} aria-hidden="true">
                    {entry.userInitials}
                  </span>
                  <span className={styles.text}>
                    <strong>{entry.isCurrentUser ? "You" : entry.userName}</strong> logged{" "}
                    {formatCount(entry.value)} {entry.unit} to {entry.challengeName}
                  </span>
                  <span className={styles.time}>{relativeTime(entry.loggedAt, now)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Popover>
    </>
  );
}
