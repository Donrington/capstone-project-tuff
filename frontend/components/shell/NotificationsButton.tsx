"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, CalendarClock, Flame, Info, Trophy, UsersRound, type LucideIcon } from "lucide-react";
import { Popover } from "@/components/ui/Popover";
import { relativeTime } from "@/lib/time";
import type { AppNotification, NotificationType } from "@/lib/types";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/app/(app)/actions";
import styles from "./NotificationsButton.module.css";

interface NotificationsButtonProps {
  notifications: AppNotification[];
  /** A fixed snapshot for relative-time text — never computed client-side
   *  from `Date.now()`, which would mismatch the server's HTML. */
  now: string;
}

const ICON: Record<NotificationType, LucideIcon> = {
  challenge: CalendarClock,
  achievement: Trophy,
  reminder: Flame,
  general: UsersRound,
  system: Info,
};

/** Where a notification leads. The model has no link field, so it's derived
 *  from `type` here, in the UI, rather than stored. */
function hrefFor(type: NotificationType): string | null {
  switch (type) {
    case "challenge":
      return "/challenges";
    case "achievement":
      return "/profile#achievements";
    case "reminder":
      return "/dashboard";
    case "general":
      return "/teams";
    default:
      return null;
  }
}

/**
 * The bell, on every app page (via HeaderUtilities). Rows are marked read as
 * they're opened, or all at once from the panel header. Read state updates
 * here straight away; the server action catches the rest of the app up.
 */
export function NotificationsButton({ notifications, now }: NotificationsButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelHeadRef = useRef<HTMLHeadingElement>(null);

  const isRead = (n: AppNotification) => n.read || readIds.has(n.id);
  const unreadCount = notifications.filter((n) => !isRead(n)).length;

  // Move focus into the panel as it opens, so the keyboard lands on it.
  useEffect(() => {
    if (open) panelHeadRef.current?.focus();
  }, [open]);

  function markRead(id: string) {
    setReadIds((current) => new Set(current).add(id));
    startTransition(() => markNotificationReadAction(id));
  }

  function markAll() {
    setReadIds(new Set(notifications.map((n) => n.id)));
    startTransition(() => markAllNotificationsReadAction());
  }

  function openRow(n: AppNotification) {
    if (!isRead(n)) markRead(n.id);
    const href = hrefFor(n.type);
    setOpen(false);
    if (href) router.push(href);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={18} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className={styles.count} aria-hidden="true">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={triggerRef}
        align="end"
        role="dialog"
        className={styles.panel}
        aria-label="Notifications"
      >
        <div className={styles.head}>
          <h2 ref={panelHeadRef} tabIndex={-1} className={styles.title}>
            Notifications
          </h2>
          {unreadCount > 0 && (
            <button type="button" className={styles.markAll} onClick={markAll}>
              Mark all as read
            </button>
          )}
        </div>

        {unreadCount === 0 && <p className={styles.caughtUp}>You&apos;re all caught up.</p>}

        {notifications.length > 0 && (
          <ul className={styles.list} data-lenis-prevent>
            {notifications.map((n) => {
              const Icon = ICON[n.type];
              const unread = !isRead(n);
              const href = hrefFor(n.type);
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    className={`${styles.row} ${unread ? styles.unread : ""} ${href ? "" : styles.static}`}
                    onClick={() => openRow(n)}
                    // A non-link row that's already read has nothing left to do.
                    disabled={!href && !unread}
                  >
                    <span className={styles.iconWrap} aria-hidden="true">
                      <Icon size={16} strokeWidth={2.25} />
                    </span>
                    <span className={styles.text}>
                      <span className={styles.rowTitle}>
                        {unread && <span className={styles.newTag}>New</span>}
                        <strong>{n.title}</strong>
                      </span>
                      <span className={styles.message}>{n.message}</span>
                    </span>
                    <span className={styles.time}>{relativeTime(n.createdAt, now)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Popover>
    </>
  );
}
