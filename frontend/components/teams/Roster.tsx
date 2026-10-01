import type { CSSProperties } from "react";
import { Avatar } from "@/components/ui/Avatar";
import type { TeamMember } from "@/lib/data";
import styles from "./teams.module.css";

/** Everyone on the team, most points first, with their share of the week. */
export function Roster({ members }: { members: TeamMember[] }) {
  // Points come from the leaderboard; until it exists they're null and the
  // roster just lists people.
  const scored = members.some((m) => m.weeklyPoints !== null);
  const total = members.reduce((sum, m) => sum + (m.weeklyPoints ?? 0), 0) || 1;
  const top = Math.max(...members.map((m) => m.weeklyPoints ?? 0), 1);

  return (
    <section className={styles.panel} aria-labelledby="roster-heading">
      <h2 id="roster-heading" className={styles.kicker}>
        Roster
      </h2>
      <ul className={styles.roster}>
        {members.map((m) => (
          <li key={m.id} id={`member-${m.id}`} className={`${styles.member} ${m.isCurrentUser ? styles.mineMember : ""}`}>
            <Avatar initials={m.initials} size="md" photoUrl={m.profilePicture} activeToday={m.activeToday} />
            <div className={styles.memberBody}>
              <div className={styles.memberLine}>
                <span className={styles.memberName}>
                  {m.name}
                  {m.isCurrentUser && " (You)"}
                </span>
                {m.weeklyPoints !== null && (
                  <span className={styles.memberPoints}>
                    {m.weeklyPoints.toLocaleString("en-US")} pts
                    <span className={styles.memberShare}> · {Math.round((m.weeklyPoints / total) * 100)}%</span>
                  </span>
                )}
              </div>
              <div className={styles.memberMeta}>
                {m.activeToday ? "Logged today" : "Nothing logged today"}
                {m.isCreator && " · Started the team"}
              </div>
              {scored && (
                <div className={styles.contribTrack} aria-hidden="true">
                  <div
                    className={styles.contribFill}
                    style={{ "--w": `${((m.weeklyPoints ?? 0) / top) * 100}%` } as CSSProperties}
                  />
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
