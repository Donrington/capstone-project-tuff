import { Flame, Footprints, Target, Trophy, Zap } from "lucide-react";
import { ShareWinButton } from "@/components/share/ShareWinButton";
import { formatCount } from "@/lib/challenge-card";
import { pluralize } from "@/lib/pluralize";
import type { ProfileStats } from "@/lib/types";
import styles from "./StatTiles.module.css";

export function StatTiles({ stats }: { stats: ProfileStats }) {
  const tiles = [
    {
      icon: Flame,
      label: "Current streak",
      value: `${stats.currentStreak}`,
      unit: pluralize(stats.currentStreak, "day"),
      // A streak is only worth sharing once it's more than a couple of days.
      share: stats.currentStreak >= 3,
    },
    { icon: Trophy, label: "Best streak", value: `${stats.bestStreak}`, unit: pluralize(stats.bestStreak, "day"), share: false },
    { icon: Footprints, label: "Lifetime steps", value: formatCount(stats.lifetimeSteps), unit: "", share: false },
    { icon: Zap, label: "Reps logged", value: formatCount(stats.repsLogged), unit: "", share: false },
    { icon: Target, label: "Challenges cleared", value: `${stats.challengesCleared}`, unit: "", share: false },
  ];

  return (
    <div className={styles.grid}>
      {tiles.map(({ icon: Icon, label, value, unit, share }) => (
        <div key={label} className={styles.tile}>
          <span className={styles.iconWrap}>
            <Icon size={18} strokeWidth={2.25} aria-hidden="true" />
          </span>
          <span className={styles.value}>
            {value}
            {unit && <small className={styles.unit}> {unit}</small>}
          </span>
          <span className={styles.label}>{label}</span>
          {share && (
            <span className={styles.share}>
              <ShareWinButton
                size="sm"
                href="/share/card?kind=streak"
                filename="tuff-streak.png"
                title="TUFF — streak"
                text={`${stats.currentStreak} ${pluralize(stats.currentStreak, "day")} in a row on TUFF`}
              />
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
