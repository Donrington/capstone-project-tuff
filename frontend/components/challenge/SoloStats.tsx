import { Flame, Medal } from "lucide-react";
import { formatDay } from "@/lib/dates";
import { pluralize } from "@/lib/pluralize";
import styles from "./challenge.module.css";

/** Solo challenges swap the team breakdown for your streak and best days. */
export function SoloStats({
  streak,
  bestDays,
  unit,
  timeZone,
}: {
  streak: number;
  bestDays: { date: string; total: number }[];
  unit: string;
  timeZone: string;
}) {
  const singular = unit.endsWith("s") ? unit.slice(0, -1) : unit;
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
              <span className={styles.bestDate}>
                {formatDay(d.date, timeZone, { weekday: "short", day: "numeric", month: "short" })}
              </span>
              <span className={styles.bestValue}>
                {d.total.toLocaleString("en-US")} {pluralize(d.total, singular, unit)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
