import { Lock, Trophy } from "lucide-react";
import type { Achievement } from "@/lib/types";
import styles from "./AchievementsGrid.module.css";

function earnedLabel(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function AchievementsGrid({ achievements }: { achievements: Achievement[] }) {
  return (
    <section className={styles.section} aria-labelledby="achievements-heading">
      <h2 id="achievements-heading" className={styles.heading}>
        Achievements
      </h2>
      <div className={styles.grid}>
        {achievements.map((a) => {
          const earned = a.earnedAt !== null;
          return (
            <div key={a.id} className={`${styles.card} ${earned ? styles.earned : styles.locked}`}>
              <span className={styles.iconWrap}>
                {earned ? (
                  <Trophy size={18} strokeWidth={2.25} aria-hidden="true" />
                ) : (
                  <Lock size={16} strokeWidth={2.25} aria-hidden="true" />
                )}
              </span>
              <div className={styles.text}>
                <p className={styles.name}>{a.name}</p>
                <p className={styles.rule}>{a.rule}</p>
                <p className={styles.status}>
                  {earned
                    ? `Earned ${earnedLabel(a.earnedAt!)}`
                    : a.progress
                      ? `Locked · ${a.progress.current} of ${a.progress.target}`
                      : "Locked"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
