import type { CSSProperties } from "react";
import styles from "./ColumnChart.module.css";

export interface ColumnDatum {
  key: string;
  /** Under the column — short, e.g. "Mon" or "3". */
  label: string;
  /** In the tooltip and the table, e.g. "Monday" or "Day 3, Sep 24". */
  fullLabel: string;
  value: number;
  state: "past" | "today" | "future";
}

interface ColumnChartProps {
  data: ColumnDatum[];
  /** A solid hairline, e.g. the daily goal or the pace needed. */
  reference?: { value: number; label: string };
  /** The visually hidden table's caption — what the chart shows. */
  caption: string;
  categoryHeader: string;
  valueHeader: string;
  /** Appended to values in tooltips, e.g. "steps". */
  unit: string;
  height?: number;
}

const fmt = (n: number) => n.toLocaleString("en-US");

/**
 * Single-series column chart: one bar per column, today highlighted in
 * accent-volt and the rest in a de-emphasis gray (highlight one, gray the
 * rest); days still to come are empty outlined slots. A solid hairline marks
 * the reference. Today's value is the only direct label; every column shows
 * its value on hover or keyboard focus, and a visually hidden table carries
 * the same numbers for screen readers.
 */
export function ColumnChart({
  data,
  reference,
  caption,
  categoryHeader,
  valueHeader,
  unit,
  height = 190,
}: ColumnChartProps) {
  const max = Math.max(reference?.value ?? 0, ...data.map((d) => d.value), 1) * 1.12;
  const refShare = reference ? reference.value / max : 0;

  return (
    <>
      <div
        className={styles.plot}
        style={{ height, gridTemplateColumns: `repeat(${data.length}, 1fr)` } as CSSProperties}
        data-dense={data.length > 10 ? "" : undefined}
      >
        {reference && (
          <>
            <div className={styles.reference} style={{ "--g": refShare } as CSSProperties} aria-hidden="true" />
            {/* Its own layer, above the columns, so a bar never hides it. */}
            <span className={styles.referenceLabel} style={{ "--g": refShare } as CSSProperties} aria-hidden="true">
              {reference.label}
            </span>
          </>
        )}
        {data.map((d, i) => {
          const future = d.state === "future";
          const heightPct = future ? Math.max(refShare * 100, 30) : (d.value / max) * 100;
          return (
            <div
              key={d.key}
              className={`${styles.col} ${d.state === "today" ? styles.today : ""} ${future ? styles.future : ""}`}
              tabIndex={future ? undefined : 0}
              aria-label={future ? undefined : `${d.fullLabel}: ${fmt(d.value)} ${unit}`}
              aria-hidden={future || undefined}
              style={{ "--h": `${heightPct}%`, "--i": i } as CSSProperties}
            >
              <div className={styles.slot}>
                <div className={styles.bar} />
                {d.state === "today" && d.value > 0 && <span className={styles.capLabel}>{fmt(d.value)}</span>}
                {!future && (
                  <div className={styles.tooltip} aria-hidden="true">
                    <strong>{fmt(d.value)}</strong>
                    <span>{d.fullLabel}</span>
                  </div>
                )}
              </div>
              <span className={styles.day} aria-hidden="true">
                {d.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* sr-only on a wrapper, not the table itself: a <table> keeps a
          minimum width for any unbreakable run of text (a long day label, a
          formatted number) even under width:1px, which inflated the page's
          scrollWidth and left a dead horizontal-scroll zone on mobile for
          content nobody could ever see. The wrapper's own box is what
          actually gets clipped; the table inside can size however it likes. */}
      <div className="sr-only">
        <table>
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th scope="col">{categoryHeader}</th>
              <th scope="col">{valueHeader}</th>
            </tr>
          </thead>
          <tbody>
            {data
              .filter((d) => d.state !== "future")
              .map((d) => (
                <tr key={d.key}>
                  <th scope="row">
                    {d.fullLabel}
                    {d.state === "today" ? " (today)" : ""}
                  </th>
                  <td>{fmt(d.value)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
