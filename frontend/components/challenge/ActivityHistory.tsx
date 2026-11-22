"use client";

import { useState } from "react";
import Link from "next/link";
import { Camera } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { LocalTime } from "@/components/ui/LocalTime";
import { dayKey, dayNumber, formatDay } from "@/lib/dates";
import type { ActivityEntry } from "@/lib/types";
import styles from "./challenge.module.css";

const PAGE = 10;

/** "Today", "Yesterday", or "Mon, Sep 21" — computed from calendar day keys in
 *  the viewer's zone and relative to the page's `now` snapshot, never Date.now(),
 *  so server and client agree. */
function dayHeading(day: string, today: string, timeZone: string) {
  const distance = dayNumber(today) - dayNumber(day);
  if (distance === 0) return "Today";
  if (distance === 1) return "Yesterday";
  return formatDay(day, timeZone, { weekday: "short", day: "numeric", month: "short" });
}

interface ActivityHistoryProps {
  entries: ActivityEntry[];
  now: string;
  timeZone: string;
  title?: string;
  /** Show which challenge each entry was for (team feed, profile). */
  showChallenge?: boolean;
  emptyText?: string;
  headingId?: string;
}

/** Logged entries grouped by day, ten at a time. */
export function ActivityHistory({
  entries,
  now,
  timeZone,
  title = "Activity",
  showChallenge,
  emptyText = "No activity yet. Be first.",
  headingId = "history-heading",
}: ActivityHistoryProps) {
  const [shown, setShown] = useState(PAGE);
  const visible = entries.slice(0, shown);

  const todayKey = dayKey(now, timeZone);
  const groups: { heading: string; items: ActivityEntry[] }[] = [];
  for (const entry of visible) {
    const heading = dayHeading(dayKey(entry.recordedAt, timeZone), todayKey, timeZone);
    const last = groups[groups.length - 1];
    if (last?.heading === heading) last.items.push(entry);
    else groups.push({ heading, items: [entry] });
  }

  return (
    <section className={styles.panel} aria-labelledby={headingId}>
      <div className={styles.panelHead}>
        <h2 id={headingId} className={styles.panelTitle}>
          {title}
        </h2>
      </div>

      {entries.length === 0 ? (
        <p className={styles.empty}>{emptyText}</p>
      ) : (
        <>
          {groups.map((group) => (
            <div key={group.heading} className={styles.dayGroup}>
              <h3 className={styles.dayHeading}>{group.heading}</h3>
              <ul className={styles.entries}>
                {group.items.map((e) => (
                  <li key={e.id} className={styles.entry}>
                    <Avatar initials={e.person.initials} size="sm" photoUrl={e.person.profilePicture} />
                    <p className={styles.entryText}>
                      <strong>{e.isCurrentUser ? "You" : e.person.name}</strong> logged{" "}
                      {e.value.toLocaleString("en-US")} {e.unit}
                      {showChallenge && e.challengeId && (
                        <>
                          {" "}
                          to <Link href={`/challenges/${e.challengeId}`}>{e.challengeName}</Link>
                        </>
                      )}
                      {e.source === "camera" && (
                        <>
                          {" "}
                          <span
                            className={styles.cameraBadge}
                            title="Counted by the camera on their device"
                            aria-label="Counted by the camera on their device"
                          >
                            <Camera size={12} strokeWidth={2.25} aria-hidden="true" />
                            Camera-counted
                          </span>
                        </>
                      )}
                    </p>
                    <LocalTime className={styles.entryTime} iso={e.recordedAt} timeZone={timeZone} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {shown < entries.length && (
            <button type="button" className={styles.more} onClick={() => setShown((n) => n + PAGE)}>
              Show more
            </button>
          )}
        </>
      )}
    </section>
  );
}
