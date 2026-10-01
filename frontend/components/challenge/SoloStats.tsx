import { Flame, Medal } from "lucide-react";
import styles from "./challenge.module.css";

const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** Solo challenges swap the team breakdown for your streak and best days. */
export function SoloStats({
  streak,
  bestDays,
  unit,
}: {
  streak: number;
  bestDays: { date: string; total: number }[];
  unit: string;
}) {
  return (
    <section className={styles.panel} aria-labelledby="solo-heading">
      <div className={styles.panelHead}>
        <h2 id="solo-heading" className={styles.panelTitle}>
          Your best days
        </h2>
      </div>
      <p className={styles.streak}>
        <Flame size={18} aria-hidden="true" />
        {streak === 0 ? "No streak on this one yet." : `${streak}-day streak on this challenge`}
      </p>
      {bestDays.length === 0 ? (
        <p className={styles.empty}>Log a day and it shows up here.</p>
      ) : (
        <ol className={styles.bestDays}>
          {bestDays.map((d, i) => (
            <li key={d.date}>
              <Medal size={16} aria-hidden="true" className={styles[`medal${i + 1}`]} />
              <span className={styles.bestDate}>{dayLabel(d.date)}</span>
              <span className={styles.bestValue}>
                {d.total.toLocaleString("en-US")} {unit}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
