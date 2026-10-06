import type { CSSProperties } from "react";
import type { Team } from "@/lib/types";
import styles from "./teams.module.css";

/** You against the team you're chasing, this week. Your team in surge, theirs in gray. */
export function HeadToHead({ team, rival, daysLeft }: { team: Team; rival: Team; daysLeft: number }) {
  // Only rendered once the leaderboard has points for both (see the teams page).
  const mine = team.weeklyPoints ?? 0;
  const theirs = rival.weeklyPoints ?? 0;
  const total = mine + theirs || 1;
  const gap = theirs - mine;
  const ahead = gap < 0;
  const left = daysLeft === 0 ? "Ends today." : `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left this week.`;

  return (
    <section className={styles.h2h} aria-labelledby="h2h-heading">
      <h2 id="h2h-heading" className={styles.kicker}>
        Head to head
      </h2>
      <div className={styles.h2hTeams}>
        <div>
          <p className={styles.h2hName}>{team.name}</p>
          <p className={styles.h2hPoints}>{mine.toLocaleString("en-US")}</p>
        </div>
        <span className={styles.vs} aria-hidden="true">
          vs
        </span>
        <div className={styles.h2hRight}>
          <p className={styles.h2hName}>{rival.name}</p>
          <p className={styles.h2hPoints}>{theirs.toLocaleString("en-US")}</p>
        </div>
      </div>
      <div
        className={styles.split}
        role="img"
        aria-label={`${team.name} ${mine.toLocaleString("en-US")} points, ${rival.name} ${theirs.toLocaleString("en-US")} points`}
      >
        <span className={styles.splitMine} style={{ "--w": `${(mine / total) * 100}%` } as CSSProperties} />
        <span className={styles.splitTheirs} />
      </div>
      <p className={styles.h2hLine}>
        <strong>
          {Math.abs(gap).toLocaleString("en-US")} points {ahead ? "ahead of" : "behind"} {rival.name}.
        </strong>{" "}
        {left}
      </p>
      {team.rivalLine && <p className={styles.h2hBanter}>{team.rivalLine}</p>}
    </section>
  );
}
