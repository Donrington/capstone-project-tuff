import { formatDay } from "@/lib/dates";
import type { HeadToHeadResult } from "@/lib/types";
import styles from "./teams.module.css";

const OUTCOME_LABEL: Record<HeadToHeadResult["outcome"], string> = {
  won: "Won",
  lost: "Lost",
  drew: "Drew",
};

const OUTCOME_CLASS: Record<HeadToHeadResult["outcome"], string> = {
  won: styles.won,
  lost: styles.lost,
  drew: styles.drew,
};

/** Completed weeks against a rival — "Won", "Lost" and "Drew" in words, not
 *  just color. `weekOf` is a Monday from the shared UTC week window; formatDay
 *  treats date keys as calendar labels and won't shift them by zone. */
export function HeadToHeadResults({ results, timeZone }: { results: HeadToHeadResult[]; timeZone: string }) {
  return (
    <section className={styles.panel} aria-labelledby="results-heading">
      <h2 id="results-heading" className={styles.kicker}>
        Recent head to heads
      </h2>
      {results.length === 0 ? (
        <p className={styles.muted}>
          No completed weeks against a rival yet. We&apos;ll show the first result after this week ends.
        </p>
      ) : (
        <ul className={styles.results}>
          {results.map((r) => (
            <li key={r.weekOf} className={styles.result}>
              <span className={`${styles.chip} ${OUTCOME_CLASS[r.outcome]}`}>{OUTCOME_LABEL[r.outcome]}</span>
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
