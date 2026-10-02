import type { HeadToHeadResult } from "@/lib/types";
import styles from "./teams.module.css";

const weekLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** The last four weeks against a rival — "Won" and "Lost" in words, not just color. */
export function HeadToHeadResults({ results }: { results: HeadToHeadResult[] }) {
  return (
    <section className={styles.panel} aria-labelledby="results-heading">
      <h2 id="results-heading" className={styles.kicker}>
        Recent head to heads
      </h2>
      {results.length === 0 ? (
        <p className={styles.muted}>No results yet. The first week&apos;s matchup ends on Sunday.</p>
      ) : (
        <ul className={styles.results}>
          {results.map((r) => (
            <li key={r.weekOf} className={styles.result}>
              <span className={`${styles.chip} ${r.outcome === "won" ? styles.won : styles.lost}`}>
                {r.outcome === "won" ? "Won" : "Lost"}
              </span>
              <span className={styles.resultText}>
                vs {r.opponentName}
                <span className={styles.resultSub}>
                  Week of {weekLabel(r.weekOf)} · {r.points.toLocaleString("en-US")} to{" "}
                  {r.opponentPoints.toLocaleString("en-US")}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
