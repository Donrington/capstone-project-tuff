import Link from "next/link";
import type { Team } from "@/lib/types";
import styles from "./teams.module.css";

const medal: Record<number, string> = { 1: styles.gold, 2: styles.silver, 3: styles.bronze };

/** Every team this week, best first. Yours is marked in words as well as color. */
export function TeamStandings({ teams, myTeamId }: { teams: Team[]; myTeamId: string | null }) {
  return (
    <section className={styles.standings} aria-labelledby="standings-heading">
      <h2 id="standings-heading" className={styles.kicker}>
        Standings this week
      </h2>
      <ol className={styles.standingsList}>
        {teams.map((t) => {
          const mine = t.id === myTeamId;
          return (
            <li key={t.id}>
              <Link
                href={`/teams/${t.id}`}
                className={`${styles.standingRow} ${mine ? styles.mineRow : ""}`}
                aria-current={mine ? "true" : undefined}
              >
                <span className={`${styles.rank} ${medal[t.rank] ?? ""}`}>{t.rank}</span>
                <span className={styles.standingName}>
                  {t.name}
                  {mine && <span className={styles.youTag}> (Your team)</span>}
                  <span className={styles.standingSub}>{t.memberIds.length} members</span>
                </span>
                <span className={styles.standingPoints}>
                  {t.weeklyPoints.toLocaleString("en-US")}
                  <span className={styles.unit}>pts</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
