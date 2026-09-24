import type { LeaderboardEntry } from "@/lib/types";
import styles from "./Leaderboard.module.css";

const medalClass: Record<number, string> = {
  1: styles.gold,
  2: styles.silver,
  3: styles.bronze,
};

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  /** "card" draws its own surface; "bare" is for dropping inside a tile that already has one. */
  variant?: "card" | "bare";
}

/**
 * Ranked rows with a top-3 medal treatment. Medals are podium-only, and a
 * delta arrow only appears when the rank actually changed.
 */
export function Leaderboard({ entries, variant = "card" }: LeaderboardProps) {
  return (
    <ol className={`${styles.board} ${variant === "bare" ? styles.bare : ""}`}>
      {entries.map((entry) => {
        const delta = entry.previousRank !== undefined ? entry.previousRank - entry.rank : 0;
        return (
          <li
            key={entry.user.id}
            className={`${styles.row} ${entry.isCurrentUser ? styles.me : ""}`}
            aria-current={entry.isCurrentUser ? "true" : undefined}
          >
            <div className={`${styles.rank} ${medalClass[entry.rank] ?? ""}`}>{entry.rank}</div>
            <div className={`${styles.avatar} ${entry.isCurrentUser ? styles.ring : ""}`}>
              {entry.user.initials}
            </div>
            <div className={styles.info}>
              <div className={styles.name}>
                {entry.user.name}
                {entry.isCurrentUser ? " (You)" : ""}
              </div>
              <div className={styles.team}>{entry.teamName}</div>
            </div>
            <div className={styles.scoreCol}>
              <div className={styles.score}>
                {entry.score.toLocaleString("en-US")}
                <span className={styles.unit}>{entry.scoreUnit}</span>
              </div>
              {delta !== 0 && (
                <div className={`${styles.delta} ${delta > 0 ? styles.up : styles.down}`}>
                  <span aria-hidden="true">{delta > 0 ? "▲" : "▼"}</span>
                  <span className="sr-only">{delta > 0 ? "up" : "down"}</span> {Math.abs(delta)}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
