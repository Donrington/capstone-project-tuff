import type { PersonalBest } from "@/lib/types";
import styles from "./PersonalBestsList.module.css";

function achievedLabel(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function PersonalBestsList({ bests }: { bests: PersonalBest[] }) {
  return (
    <section className={styles.section} aria-labelledby="bests-heading">
      <h2 id="bests-heading" className={styles.heading}>
        Personal bests
      </h2>
      <ul className={styles.list}>
        {bests.map((best) => (
          <li key={best.id} className={styles.row}>
            <span className={styles.label}>{best.label}</span>
            <span className={styles.value}>{best.value}</span>
            <span className={styles.date}>{achievedLabel(best.achievedAt)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
