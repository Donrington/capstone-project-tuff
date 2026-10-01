import Link from "next/link";
import type { Team } from "@/lib/types";
import styles from "./teams.module.css";

const medal: Record<number, string> = { 1: styles.gold, 2: styles.silver, 3: styles.bronze };

/** Every team this week, best first. Yours is marked in words as well as color. */
export function TeamStandings({ teams, myTeamId }: { teams: Team[]; myTeamId: string | null }) {
  const ranked = teams.some((t) => t.rank !== null);
  return (
    <section className={styles.standings} aria-labelledby="standings-heading">
      <h2 id="standings-heading" className={styles.kicker}>
        {ranked ? "Standings this week" : "All teams"}
      </h2>
      {/* TODO(leaderboard): points and ranks arrive with GET /api/leaderboard/teams. */}
      {!ranked && <p className={styles.muted}>Points and ranks show up here once the leaderboard is live.</p>}
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
                <span className={`${styles.rank} ${t.rank ? (medal[t.rank] ?? "") : ""}`}>{t.rank ?? "·"}</span>
                <span className={styles.standingName}>
                  {t.name}
                  {mine && <span className={styles.youTag}> (Your team)</span>}
                  <span className={styles.standingSub}>
                    {t.memberCount} {t.memberCount === 1 ? "member" : "members"}
                  </span>
                </span>
                {t.weeklyPoints !== null && (
                  <span className={styles.standingPoints}>
                    {t.weeklyPoints.toLocaleString("en-US")}
                    <span className={styles.unit}>pts</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
