import type { CSSProperties } from "react";
import { TrendingUp } from "lucide-react";
import styles from "./WeeklyActivity.module.css";

interface Day {
  day: string;
  steps: number;
  today?: boolean;
}

interface WeeklyActivityProps {
  data: Day[];
  goal: number;
  deltaPct: number;
}

const DAY_NAMES: Record<string, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

/**
 * Single-series column chart: one bar per day, today highlighted in
 * accent-volt and the rest in a de-emphasis gray (highlight one, gray the
 * rest). A solid hairline marks the daily goal. Today's value is the only
 * direct label; every bar shows its value on hover or keyboard focus, and
 * a visually hidden table carries the same numbers for screen readers.
 */
export function WeeklyActivity({ data, goal, deltaPct }: WeeklyActivityProps) {
  const total = data.reduce((sum, d) => sum + d.steps, 0);
  const max = Math.max(goal, ...data.map((d) => d.steps)) * 1.12;

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div>
          <p className={styles.label}>This week</p>
          <p className={styles.total}>
            {total.toLocaleString("en-US")}
            <span className={styles.totalUnit}> steps</span>
          </p>
        </div>
        <p className={styles.delta}>
          <TrendingUp size={14} strokeWidth={2.5} aria-hidden="true" />+{deltaPct}% vs last week
        </p>
      </div>

      <div className={styles.plot} aria-hidden="true">
        <div className={styles.goal} style={{ "--g": goal / max } as CSSProperties}>
          <span className={styles.goalLabel}>{(goal / 1000).toLocaleString("en-US")}k goal</span>
        </div>
        {data.map((d) => {
          const heightPct = (d.steps / max) * 100;
          return (
            <div
              key={d.day}
              className={`${styles.col} ${d.today ? styles.today : ""}`}
              tabIndex={0}
              style={{ "--h": `${heightPct}%` } as CSSProperties}
            >
              <div className={styles.slot}>
                <div className={styles.bar} />
                {d.today && <span className={styles.capLabel}>{d.steps.toLocaleString("en-US")}</span>}
                <div className={styles.tooltip} role="tooltip">
                  <strong>{d.steps.toLocaleString("en-US")}</strong>
                  <span>{DAY_NAMES[d.day] ?? d.day}</span>
                </div>
              </div>
              <span className={styles.day}>{d.day}</span>
            </div>
          );
        })}
      </div>

      <table className="sr-only">
        <caption>Steps per day this week. Daily goal {goal.toLocaleString("en-US")} steps.</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Steps</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.day}>
              <th scope="row">
                {DAY_NAMES[d.day] ?? d.day}
                {d.today ? " (today)" : ""}
              </th>
              <td>{d.steps.toLocaleString("en-US")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
