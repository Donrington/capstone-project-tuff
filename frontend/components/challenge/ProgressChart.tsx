import { ColumnChart } from "@/components/charts/ColumnChart";
import type { DailyTotal } from "@/lib/types";
import styles from "./challenge.module.css";

const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** One column per day of the challenge, against the even pace that finishes on time. */
export function ProgressChart({ daily, pacePerDay, unit }: { daily: DailyTotal[]; pacePerDay: number; unit: string }) {
  return (
    <section className={styles.panel} aria-labelledby="progress-heading">
      <div className={styles.panelHead}>
        <h2 id="progress-heading" className={styles.panelTitle}>
          Progress over time
        </h2>
        <p className={styles.panelNote}>
          {pacePerDay.toLocaleString("en-US")} {unit} a day finishes on time
        </p>
      </div>
      <ColumnChart
        data={daily.map((d) => ({
          key: d.date,
          label: String(d.dayIndex),
          fullLabel: `Day ${d.dayIndex}, ${dayLabel(d.date)}`,
          value: d.total,
          state: d.state,
        }))}
        reference={{ value: pacePerDay, label: `${pacePerDay.toLocaleString("en-US")} a day` }}
        caption={`${unit} logged each day of the challenge. Pace needed: ${pacePerDay.toLocaleString("en-US")} a day.`}
        categoryHeader="Day"
        valueHeader={unit[0].toUpperCase() + unit.slice(1)}
        unit={unit}
        height={210}
      />
    </section>
  );
}
