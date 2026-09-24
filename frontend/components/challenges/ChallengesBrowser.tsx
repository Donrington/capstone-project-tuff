"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { Target } from "lucide-react";
import { Tabs, tabId, tabPanelId } from "@/components/ui/Tabs";
import { StandardCard, FeaturedCard } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { challengeCardCopy, challengePercent, formatCount } from "@/lib/challenge-card";
import type { Challenge } from "@/lib/types";
import styles from "./ChallengesBrowser.module.css";

export type ChallengeFilter = "all" | "solo" | "team";

const TABS: { key: ChallengeFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "solo", label: "Solo" },
  { key: "team", label: "Team" },
];

const EMPTY_COPY: Record<ChallengeFilter, string> = {
  all: "No challenges yet.",
  solo: "No solo challenges yet.",
  team: "No team challenges yet.",
};

export function ChallengesBrowser({
  challenges,
  initialFilter,
}: {
  challenges: Challenge[];
  initialFilter: ChallengeFilter;
}) {
  const [index, setIndex] = useState(Math.max(0, TABS.findIndex((t) => t.key === initialFilter)));
  const filter = TABS[index].key;

  function changeTab(next: number) {
    setIndex(next);
    // Keep the tab in the URL without a navigation, so a reload or a shared
    // link lands on the same view.
    const key = TABS[next].key;
    const url = new URL(window.location.href);
    if (key === "all") url.searchParams.delete("type");
    else url.searchParams.set("type", key);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  const visible = challenges.filter((c) => {
    if (filter === "solo") return c.teamId === null;
    if (filter === "team") return c.teamId !== null;
    return true;
  });

  return (
    <>
      <div className={styles.filters}>
        <Tabs
          tabs={TABS.map((t) => t.label)}
          idBase="challenges"
          index={index}
          onChange={changeTab}
        />
      </div>

      <div
        role="tabpanel"
        id={tabPanelId("challenges", index)}
        aria-labelledby={tabId("challenges", index)}
      >
        {visible.length === 0 ? (
          <EmptyState
            icon={Target}
            title={EMPTY_COPY[filter]}
            text="Start one and get your streak moving."
            action={<ButtonLink href="/challenges/new">New challenge</ButtonLink>}
          />
        ) : (
          <div className={styles.grid}>
            {visible.map((c, i) => {
              const props = {
                ...challengeCardCopy(c),
                description: c.description,
                progressPercent: challengePercent(c),
                statLeft: (
                  <>
                    <b>{formatCount(c.current)}</b> / {formatCount(c.target)} {c.unit}
                  </>
                ),
                statRight: `Day ${c.dayIndex} of ${c.totalDays}`,
                stretch: true,
              };
              return (
                <Link
                  key={c.id}
                  href={`/challenges/${c.id}`}
                  className={styles.cardLink}
                  style={{ "--i": i } as CSSProperties}
                >
                  {c.featured ? <FeaturedCard {...props} /> : <StandardCard {...props} />}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
