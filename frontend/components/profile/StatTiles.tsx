import { Flame, Footprints, Target, Trophy, Zap } from "lucide-react";
import { formatCount } from "@/lib/challenge-card";
import type { ProfileStats } from "@/lib/types";
import styles from "./StatTiles.module.css";

export function StatTiles({ stats }: { stats: ProfileStats }) {
  const tiles = [
    { icon: Flame, label: "Current streak", value: `${stats.currentStreak}`, unit: "days" },
    { icon: Trophy, label: "Best streak", value: `${stats.bestStreak}`, unit: "days" },
    { icon: Footprints, label: "Lifetime steps", value: formatCount(stats.lifetimeSteps), unit: "" },
    { icon: Zap, label: "Reps logged", value: formatCount(stats.repsLogged), unit: "" },
    { icon: Target, label: "Challenges cleared", value: `${stats.challengesCleared}`, unit: "" },
  ];

  return (
    <div className={styles.grid}>
      {tiles.map(({ icon: Icon, label, value, unit }) => (
        <div key={label} className={styles.tile}>
          <span className={styles.iconWrap}>
            <Icon size={18} strokeWidth={2.25} aria-hidden="true" />
          </span>
          <span className={styles.value}>
            {value}
            {unit && <small className={styles.unit}> {unit}</small>}
          </span>
          <span className={styles.label}>{label}</span>
        </div>
      ))}
    </div>
  );
}
