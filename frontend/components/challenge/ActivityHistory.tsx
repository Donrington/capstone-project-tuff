"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import type { ActivityEntry } from "@/lib/types";
import styles from "./challenge.module.css";

const PAGE = 10;
const DAY_MS = 86_400_000;

/** "Today", "Yesterday", or "Mon 21 Sep" — relative to the page's `now`
 *  snapshot, never Date.now(), so server and client agree. */
function dayHeading(iso: string, nowIso: string) {
  const day = Date.parse(iso.slice(0, 10));
  const today = Date.parse(nowIso.slice(0, 10));
  if (day === today) return "Today";
  if (day === today - DAY_MS) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

interface ActivityHistoryProps {
  entries: ActivityEntry[];
  now: string;
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
  title = "Activity",
  showChallenge,
  emptyText = "No activity yet. Be first.",
  headingId = "history-heading",
}: ActivityHistoryProps) {
  const [shown, setShown] = useState(PAGE);
  const visible = entries.slice(0, shown);

  const groups: { heading: string; items: ActivityEntry[] }[] = [];
  for (const entry of visible) {
    const heading = dayHeading(entry.recordedAt, now);
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
                    </p>
                    <time className={styles.entryTime} dateTime={e.recordedAt}>
                      {timeOf(e.recordedAt)}
                    </time>
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
