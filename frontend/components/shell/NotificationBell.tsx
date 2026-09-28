"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Flame, Info, Trophy, type LucideIcon } from "lucide-react";
import { Popover } from "@/components/ui/Popover";
import { relativeTime } from "@/lib/time";
import type { AppNotification, NotificationKind } from "@/lib/types";
import { markNotificationsSeen } from "@/app/(app)/actions";
import styles from "./NotificationBell.module.css";

interface NotificationBellProps {
  entries: AppNotification[];
  /** A fixed snapshot for relative-time text — never computed client-side
   *  from `Date.now()`, which is what caused the hydration mismatch this
   *  pattern replaced. */
  now: string;
}

const ICON: Record<NotificationKind, LucideIcon> = {
  achievement: Trophy,
  reminder: Flame,
  system: Info,
  general: Bell,
};

/** Where clicking a notification goes — kept in the UI layer, not on the
 *  model, since Notification.js has no `href` field. */
function hrefFor(kind: NotificationKind): string | null {
  if (kind === "achievement") return "/profile";
  if (kind === "reminder") return "/dashboard";
  return null; // system/general are informational, not links
}

/**
 * The nav bell: real notifications (achievement/reminder/system/general),
 * on every app page (via PageHeader). Opening it clears the unread dot —
 * see markNotificationsSeen.
 */
export function NotificationBell({ entries, now }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const marked = useRef(false);

  const unreadCount = entries.filter((e) => !e.read).length;

  useEffect(() => {
    if (open && unreadCount > 0 && !marked.current) {
      marked.current = true;
      void markNotificationsSeen();
    }
    if (!open) marked.current = false;
  }, [open, unreadCount]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} new` : "Notifications"}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={18} aria-hidden="true" />
        {unreadCount > 0 && <span className={styles.dot} aria-hidden="true" />}
      </button>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={triggerRef}
        align="end"
        className={styles.panel}
        aria-label="Notifications"
      >
        <div className={styles.head}>Notifications</div>
        {entries.length === 0 ? (
          <p className={styles.empty}>Nothing yet.</p>
        ) : (
          <ul className={styles.list}>
            {entries.map((entry) => {
              const Icon = ICON[entry.kind];
              const href = hrefFor(entry.kind);
              const content = (
                <>
                  <span className={styles.iconWrap} aria-hidden="true">
                    <Icon size={16} strokeWidth={2.25} />
                  </span>
                  <span className={styles.text}>
                    <strong>{entry.title}</strong>
                    <span className={styles.message}>{entry.message}</span>
                  </span>
                  <span className={styles.time}>{relativeTime(entry.at, now)}</span>
                </>
              );
              return (
                <li key={entry.id}>
                  {href ? (
                    <Link href={href} className={styles.row} onClick={() => setOpen(false)}>
                      {content}
                    </Link>
                  ) : (
                    <div className={`${styles.row} ${styles.static}`}>{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Popover>
    </>
  );
}
