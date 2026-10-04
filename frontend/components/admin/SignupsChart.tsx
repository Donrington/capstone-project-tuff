import styles from "./admin.module.css";

const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** New members per day: plain bars, with the numbers available as text for screen readers. */
export function SignupsChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <figure className={styles.chart}>
      <figcaption className={styles.chartCaption}>
        <strong>{total.toLocaleString("en-US")}</strong> new {total === 1 ? "member" : "members"} in the last {data.length} days
      </figcaption>
      <ol className={styles.bars}>
        {data.map((d) => (
          <li key={d.date} className={styles.barCell}>
            <span className={styles.barCount} aria-hidden="true">
              {d.count > 0 ? d.count : ""}
            </span>
            <span
              className={styles.bar}
              style={{ height: `${Math.max(d.count > 0 ? 6 : 2, (d.count / max) * 100)}%` }}
              data-empty={d.count === 0 || undefined}
            />
            <span className={styles.barLabel} aria-hidden="true">
              {dayLabel(d.date).replace(" ", " ")}
            </span>
            <span className="sr-only">
              {dayLabel(d.date)}: {d.count}
            </span>
          </li>
        ))}
      </ol>
    </figure>
  );
}
