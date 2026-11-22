import { formatDay } from "@/lib/dates";
import type { HeadToHeadResult } from "@/lib/types";
import styles from "./teams.module.css";

/** The last four weeks against a rival — "Won" and "Lost" in words, not just color.
 *  `weekOf` is a calendar day key from the shared (UTC) week window; formatDay
 *  renders such keys as labels without shifting them into another day. */
export function HeadToHeadResults({ results, timeZone }: { results: HeadToHeadResult[]; timeZone: string }) {
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
                  Week of {formatDay(r.weekOf, timeZone, { day: "numeric", month: "short" })} ·{" "}
                  {r.points.toLocaleString("en-US")} to{" "}
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
