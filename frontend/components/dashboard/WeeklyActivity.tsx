import { TrendingUp } from "lucide-react";
import { ColumnChart } from "@/components/charts/ColumnChart";
import type { DayActivity } from "@/lib/types";
import styles from "./WeeklyActivity.module.css";

interface WeeklyActivityProps {
  data: DayActivity[];
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

/** The dashboard's week: steps per day against the daily goal. */
export function WeeklyActivity({ data, goal, deltaPct }: WeeklyActivityProps) {
  const total = data.reduce((sum, d) => sum + d.steps, 0);

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
        {deltaPct > 0 && (
          <p className={styles.delta}>
            <TrendingUp size={14} strokeWidth={2.5} aria-hidden="true" />+{deltaPct}% vs last week
          </p>
        )}
      </div>

      {total === 0 ? (
        <p className={styles.empty}>Your week fills in as you log.</p>
      ) : (
        <ColumnChart
          data={data.map((d) => ({
            key: d.day,
            label: d.day,
            fullLabel: DAY_NAMES[d.day] ?? d.day,
            value: d.steps,
            state: d.today ? "today" : "past",
          }))}
          reference={{ value: goal, label: `${(goal / 1000).toLocaleString("en-US")}k goal` }}
          caption={`Steps per day this week. Daily goal ${goal.toLocaleString("en-US")} steps.`}
          categoryHeader="Day"
          valueHeader="Steps"
          unit="steps"
        />
      )}
    </div>
  );
}
