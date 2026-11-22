import { ColumnChart } from "@/components/charts/ColumnChart";
import { formatDay } from "@/lib/dates";
import { pluralize } from "@/lib/pluralize";
import type { DailyTotal } from "@/lib/types";
import styles from "./challenge.module.css";

/** One column per day of the challenge, against the even pace that finishes on time. */
export function ProgressChart({
  daily,
  pacePerDay,
  unit,
  timeZone,
}: {
  daily: DailyTotal[];
  pacePerDay: number;
  unit: string;
  timeZone: string;
}) {
  const singular = unit.endsWith("s") ? unit.slice(0, -1) : unit;
  return (
    <section className={styles.panel} aria-labelledby="progress-heading">
      <div className={styles.panelHead}>
        <h2 id="progress-heading" className={styles.panelTitle}>
          Progress over time
        </h2>
        <p className={styles.panelNote}>
          {pacePerDay.toLocaleString("en-US")} {pluralize(pacePerDay, singular, unit)} a day finishes on time
        </p>
      </div>
      <ColumnChart
        data={daily.map((d) => ({
          key: d.date,
          label: String(d.dayIndex),
          fullLabel: `Day ${d.dayIndex}, ${formatDay(d.date, timeZone, { weekday: "short", day: "numeric", month: "short" })}`,
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
