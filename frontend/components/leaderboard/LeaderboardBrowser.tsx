"use client";

import { useState } from "react";
import { Tabs, tabId, tabPanelId } from "@/components/ui/Tabs";
import { Leaderboard } from "@/components/ui/Leaderboard";
import type { LeaderboardEntry, LeaderboardPeriod } from "@/lib/types";
import styles from "./LeaderboardBrowser.module.css";

const TABS: { key: LeaderboardPeriod; label: string; subtitle: string }[] = [
  {
    key: "week",
    label: "This week",
    subtitle: "Points from every logged set, step, and streak day this week.",
  },
  { key: "all-time", label: "All time", subtitle: "Every point since you joined." },
];

/** How many rows the board shows before it pins "You" to the bottom. */
const VISIBLE_ROWS = 10;

export function LeaderboardBrowser({
  boards,
  initialPeriod,
}: {
  boards: Record<LeaderboardPeriod, LeaderboardEntry[]>;
  initialPeriod: LeaderboardPeriod;
}) {
  const [index, setIndex] = useState(Math.max(0, TABS.findIndex((t) => t.key === initialPeriod)));
  const tab = TABS[index];

  function changeTab(next: number) {
    setIndex(next);
    const url = new URL(window.location.href);
    if (TABS[next].key === "week") url.searchParams.delete("period");
    else url.searchParams.set("period", TABS[next].key);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  const board = boards[tab.key];
  const shown = board.slice(0, VISIBLE_ROWS);
  // If you'd fall off the end of the board, your row still gets shown.
  const me = board.find((entry) => entry.isCurrentUser);
  const pinned = me && !shown.includes(me) ? me : null;

  return (
    <>
      <p className={styles.subtitle}>{tab.subtitle}</p>

      <div className={styles.filters}>
        <Tabs
          tabs={TABS.map((t) => t.label)}
          idBase="leaderboard"
          index={index}
          onChange={changeTab}
        />
      </div>

      <div
        role="tabpanel"
        id={tabPanelId("leaderboard", index)}
        aria-labelledby={tabId("leaderboard", index)}
        className={styles.board}
      >
        <Leaderboard entries={shown} variant="bare" />
        {pinned && (
          <>
            <div className={styles.gap} aria-hidden="true">
              ···
            </div>
            <Leaderboard entries={[pinned]} variant="bare" />
          </>
        )}
      </div>
    </>
  );
}
