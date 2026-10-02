import type { CSSProperties } from "react";
import type { Team } from "@/lib/types";
import styles from "./teams.module.css";

/** You against the team you're chasing, this week. Your team in surge, theirs in gray. */
export function HeadToHead({ team, rival, daysLeft }: { team: Team; rival: Team; daysLeft: number }) {
  const total = team.weeklyPoints + rival.weeklyPoints || 1;
  const gap = rival.weeklyPoints - team.weeklyPoints;
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
          <p className={styles.h2hPoints}>{team.weeklyPoints.toLocaleString("en-US")}</p>
        </div>
        <span className={styles.vs} aria-hidden="true">
          vs
        </span>
        <div className={styles.h2hRight}>
          <p className={styles.h2hName}>{rival.name}</p>
          <p className={styles.h2hPoints}>{rival.weeklyPoints.toLocaleString("en-US")}</p>
        </div>
      </div>
      <div
        className={styles.split}
        role="img"
        aria-label={`${team.name} ${team.weeklyPoints.toLocaleString("en-US")} points, ${rival.name} ${rival.weeklyPoints.toLocaleString("en-US")} points`}
      >
        <span className={styles.splitMine} style={{ "--w": `${(team.weeklyPoints / total) * 100}%` } as CSSProperties} />
        <span className={styles.splitTheirs} />
      </div>
      <p className={styles.h2hLine}>
        <strong>
          {Math.abs(gap).toLocaleString("en-US")} points {ahead ? "ahead of" : "behind"} {rival.name}.
        </strong>{" "}
        {left}
      </p>
    </section>
  );
}
