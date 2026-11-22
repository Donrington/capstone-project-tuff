import { formatDay } from "@/lib/dates";
import type { PersonalBest } from "@/lib/types";
import styles from "./PersonalBestsList.module.css";

export function PersonalBestsList({ bests, timeZone }: { bests: PersonalBest[]; timeZone: string }) {
  return (
    <section className={styles.section} aria-labelledby="bests-heading">
      <h2 id="bests-heading" className={styles.heading}>
        Personal bests
      </h2>
      {bests.length === 0 ? (
        <p className={styles.empty}>Your bests show up here once you have a few days logged.</p>
      ) : (
        <ul className={styles.list}>
          {bests.map((best) => (
            <li key={best.id} className={styles.row}>
              <span className={styles.label}>{best.label}</span>
              <span className={styles.value}>{best.value}</span>
              <span className={styles.date}>{formatDay(best.achievedAt, timeZone)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
