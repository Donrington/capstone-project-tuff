import { Dumbbell, Flag, Flame, Footprints, Lock, Trophy, UsersRound, type LucideIcon } from "lucide-react";
import type { Achievement } from "@/lib/types";
import styles from "./AchievementsGrid.module.css";

/** `icon` is a Lucide name from the backend catalog (backend/data/achievements.js). */
const ICONS: Record<string, LucideIcon> = {
  footprints: Footprints,
  users: UsersRound,
  flag: Flag,
  flame: Flame,
  dumbbell: Dumbbell,
  trophy: Trophy,
};

/** What a locked achievement's progress counts, from its requirement's metric. */
const UNITS: Record<string, [string, string]> = {
  streak_days: ["day", "days"],
  challenges_completed: ["challenge", "challenges"],
  reps_in_day: ["rep", "reps"],
  steps_in_day: ["step", "steps"],
  activities_logged: ["log", "logs"],
  team_joined: ["team", "teams"],
};

function progressLabel(a: Achievement) {
  if (!a.progress) return "Locked";
  const [one, many] = UNITS[a.requirement.split(":")[0]] ?? ["", ""];
  const unit = a.progress.target === 1 ? one : many;
  return `Locked · ${a.progress.current.toLocaleString("en-US")} of ${a.progress.target.toLocaleString("en-US")} ${unit}`.trim();
}

function earnedLabel(iso: string) {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function AchievementsGrid({ achievements }: { achievements: Achievement[] }) {
  const earnedCount = achievements.filter((a) => a.earnedAt).length;
  return (
    <section id="achievements" className={styles.section} aria-labelledby="achievements-heading">
      <h2 id="achievements-heading" className={styles.heading}>
        Achievements{" "}
        <span className={styles.count}>
          {earnedCount} of {achievements.length}
        </span>
      </h2>
      <div className={styles.grid}>
        {achievements.map((a) => {
          const earned = a.earnedAt !== null;
          const Icon = (a.icon && ICONS[a.icon]) || Trophy;
          return (
            <div key={a.id} className={`${styles.card} ${earned ? styles.earned : styles.locked}`}>
              <span className={styles.iconWrap}>
                {earned ? (
                  <Icon size={18} strokeWidth={2.25} aria-hidden="true" />
                ) : (
                  <Lock size={16} strokeWidth={2.25} aria-hidden="true" />
                )}
              </span>
              <div className={styles.text}>
                <p className={styles.name}>{a.name}</p>
                <p className={styles.rule}>{a.description}</p>
                <p className={styles.status}>{earned ? `Earned ${earnedLabel(a.earnedAt!)}` : progressLabel(a)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
