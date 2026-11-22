"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { formatDay } from "@/lib/dates";
import {
  MATCHUP_REACTIONS,
  REACTION_GLYPH,
  REACTION_LABEL,
  type MatchupReactionKey,
} from "@/lib/matchup";
import { pluralize } from "@/lib/pluralize";
import type { Matchup, MatchupReactionState } from "@/lib/types";
import styles from "./teams.module.css";

type RefreshState = "live" | "retrying" | "paused";

const FAST_POLL_MS = 15_000;
const SLOW_POLL_MS = 60_000;
/** Three misses in a row, not one: a single timeout during a deploy shouldn't
 *  leave the card a minute behind. */
const FAILURES_BEFORE_BACKOFF = 3;

async function errorMessage(res: Response, fallback: string) {
  try {
    const body = await res.json();
    return body?.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}

/** Both reads and writes go through the Next route, never straight to Express. */
async function fetchMatchup(teamId: string): Promise<Matchup> {
  const res = await fetch(`/api/teams/${encodeURIComponent(teamId)}/matchup`, { cache: "no-store" });
  if (!res.ok) throw new Error(await errorMessage(res, "Couldn't refresh the matchup."));
  return (await res.json()) as Matchup;
}

async function writeReaction(
  teamId: string,
  emoji: MatchupReactionKey | null,
): Promise<MatchupReactionState> {
  const path = `/api/teams/${encodeURIComponent(teamId)}/matchup/reaction`;
  const res = await fetch(path, {
    method: emoji ? "PUT" : "DELETE",
    cache: "no-store",
    ...(emoji ? { headers: { "content-type": "application/json" }, body: JSON.stringify({ emoji }) } : {}),
  });
  if (!res.ok) throw new Error(await errorMessage(res, "Couldn't save your reaction."));
  return (await res.json()) as MatchupReactionState;
}

/** You against the team you're chasing, this week. Your team in surge, theirs
 *  in gray. Seeded on the server, then kept fresh by short, polite polling. */
export function HeadToHead({
  initialMatchup,
  teamId,
  timeZone = "UTC",
  canReact = true,
}: {
  initialMatchup: Matchup;
  teamId: string;
  timeZone?: string;
  canReact?: boolean;
}) {
  const [matchup, setMatchup] = useState(initialMatchup);
  const [reactions, setReactions] = useState(initialMatchup.reactions);
  const [refreshState, setRefreshState] = useState<RefreshState>("live");
  const [reactionError, setReactionError] = useState<string | null>(null);
  const [pops, setPops] = useState<{ mine: number; rival: number }>({ mine: 0, rival: 0 });
  const lastPoints = useRef({ mine: initialMatchup.team.points, rival: initialMatchup.rival?.points ?? null });
  const pendingReaction = useRef(false);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;

    async function refresh() {
      if (document.hidden || stopped) return;
      try {
        const next = await fetchMatchup(teamId);
        if (stopped) return;
        const gained = {
          mine: Math.max(0, next.team.points - lastPoints.current.mine),
          rival: next.rival && lastPoints.current.rival !== null
            ? Math.max(0, next.rival.points - lastPoints.current.rival)
            : 0,
        };
        lastPoints.current = { mine: next.team.points, rival: next.rival?.points ?? null };
        setMatchup(next);
        // Don't overwrite a tap that hasn't come back from the server yet.
        if (!pendingReaction.current) setReactions(next.reactions);
        if (gained.mine || gained.rival) setPops(gained);
        failures = 0;
        setRefreshState("live");
      } catch {
        if (stopped) return;
        failures += 1;
        setRefreshState(failures >= FAILURES_BEFORE_BACKOFF ? "retrying" : "live");
      } finally {
        // Scheduling here (rather than with setInterval) means a slow response
        // can't stack up requests, and hidden tabs never keep a timer at all.
        if (!stopped && !document.hidden) {
          timer = setTimeout(refresh, failures >= FAILURES_BEFORE_BACKOFF ? SLOW_POLL_MS : FAST_POLL_MS);
        }
      }
    }

    function start() {
      if (timer) clearTimeout(timer);
      if (document.hidden) {
        setRefreshState("paused");
        return;
      }
      void refresh();
    }

    function onVisibilityChange() {
      // A tab coming back gets an immediate read, so a hidden half-hour doesn't
      // leave stale numbers on screen until the next tick.
      if (document.hidden) {
        if (timer) clearTimeout(timer);
        setRefreshState("paused");
      } else {
        setRefreshState("live");
        start();
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    start();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [teamId]);

  useEffect(() => {
    if (!pops.mine && !pops.rival) return;
    const timer = setTimeout(() => setPops({ mine: 0, rival: 0 }), 2_000);
    return () => clearTimeout(timer);
  }, [pops]);

  async function react(emoji: MatchupReactionKey) {
    if (!canReact || pendingReaction.current) return;
    const before = reactions;
    const nextEmoji = before.mine === emoji ? null : emoji;
    const optimistic: MatchupReactionState = {
      counts: { ...before.counts },
      mine: nextEmoji,
    };
    if (before.mine) optimistic.counts[before.mine] = Math.max(0, optimistic.counts[before.mine] - 1);
    if (nextEmoji) optimistic.counts[nextEmoji] += 1;

    setReactions(optimistic);
    setReactionError(null);
    pendingReaction.current = true;
    try {
      setReactions(await writeReaction(teamId, nextEmoji));
    } catch (err) {
      // Put the tap back the way it was — a failed vote must not look saved.
      setReactions(before);
      setReactionError(err instanceof Error ? err.message : "Couldn't save your reaction.");
    } finally {
      pendingReaction.current = false;
    }
  }

  const mine = matchup.team.points;
  const theirs = matchup.rival?.points ?? 0;
  const total = mine + theirs || 1;
  const gap = theirs - mine;
  const ahead = gap < 0;
  const tie = gap === 0;
  const daysLeft = Math.max(0, Math.ceil((Date.parse(matchup.weekEnd) - Date.now()) / 86_400_000));
  const left = daysLeft === 0 ? "Ends today." : `${daysLeft} ${pluralize(daysLeft, "day")} left this week.`;
  const statusText =
    refreshState === "paused"
      ? "Paused while this tab is hidden"
      : refreshState === "retrying"
        ? "Connection trouble — checking again in a minute"
        : "Checking for new points every 15s";

  return (
    <section className={styles.h2h} aria-labelledby="h2h-heading">
      <div className={styles.h2hHead}>
        <h2 id="h2h-heading" className={styles.kicker}>
          Head to head
        </h2>
        <p className={styles.pollStatus} role="status">
          <span className={refreshState === "live" ? styles.liveDot : styles.quietDot} aria-hidden="true" />
          {statusText}
        </p>
      </div>

      <div className={styles.h2hTeams}>
        <div>
          <p className={styles.h2hName}>{matchup.team.name}</p>
          <p className={styles.h2hPoints}>
            {mine.toLocaleString("en-US")}
            {pops.mine > 0 && (
              <span key={`mine-${matchup.updatedAt}`} className={styles.pointPop} aria-hidden="true">
                +{pops.mine}
              </span>
            )}
          </p>
        </div>
        <span className={styles.vs} aria-hidden="true">
          vs
        </span>
        <div className={styles.h2hRight}>
          <p className={styles.h2hName}>{matchup.rival?.name ?? "No rival yet"}</p>
          <p className={styles.h2hPoints}>
            {theirs.toLocaleString("en-US")}
            {pops.rival > 0 && (
              <span key={`rival-${matchup.updatedAt}`} className={styles.pointPop} aria-hidden="true">
                +{pops.rival}
              </span>
            )}
          </p>
        </div>
      </div>

      {matchup.rival ? (
        <>
          <div
            className={styles.split}
            role="img"
            aria-label={`${matchup.team.name} ${mine.toLocaleString("en-US")} ${pluralize(mine, "point")}, ${matchup.rival.name} ${theirs.toLocaleString("en-US")} ${pluralize(theirs, "point")}`}
          >
            <span
              className={styles.splitMine}
              style={{ "--w": `${(mine / total) * 100}%` } as CSSProperties}
            />
            <span className={styles.splitTheirs} />
          </div>
          <p className={styles.h2hLine}>
            <strong>
              {tie
                ? `Level with ${matchup.rival.name}.`
                : `${Math.abs(gap).toLocaleString("en-US")} ${pluralize(gap, "point")} ${ahead ? "ahead of" : "behind"} ${matchup.rival.name}.`}
            </strong>{" "}
            {left}
          </p>
          {matchup.rivalLine && <p className={styles.h2hBanter}>{matchup.rivalLine}</p>}
        </>
      ) : (
        <p className={styles.muted}>
          Once another team has points this week, they&apos;ll show up here as your rival.
        </p>
      )}

      {canReact && (
        <div className={styles.reactions}>
          <p className={styles.reactionsLabel}>How&apos;s this week going?</p>
          <div className={styles.reactionRow}>
            {MATCHUP_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={styles.reactionButton}
                aria-pressed={reactions.mine === emoji}
                onClick={() => void react(emoji)}
              >
                <span aria-hidden="true">{REACTION_GLYPH[emoji]}</span>
                <span>{REACTION_LABEL[emoji]}</span>
                <span className={styles.reactionCount}>{reactions.counts[emoji]}</span>
              </button>
            ))}
          </div>
          <p className={styles.reactionNote} role="status">
            {reactionError ?? "One pick each week. Tap again to take it back."}
          </p>
        </div>
      )}

      <p className={styles.weekStamp}>
        Week of {formatDay(matchup.weekStart, timeZone, { day: "numeric", month: "short" })} · UTC
      </p>
    </section>
  );
}
