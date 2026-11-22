import styles from "./ProgressRing.module.css";

interface ProgressRingProps {
  /** 0-100 */
  percent: number;
  size?: "hero" | "compact";
  /** Hero size only — e.g. "7,502 / 10,000" */
  sublabel?: string;
}

/**
 * SVG circular progress indicator. Track always draws first in
 * border-strong, the arc on top in volt-ink — swapping to success-ink at
 * 100%, per the ProgressRing usage rules. Only stroke-dashoffset (and, at
 * completion, stroke color) ever animates.
 */
export function ProgressRing({ percent, size = "hero", sublabel }: ProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  const isHero = size === "hero";
  const dimension = isHero ? 220 : 56;
  const strokeWidth = isHero ? 14 : 6;
  const radius = dimension / 2 - strokeWidth / 2 - (isHero ? 4 : 0);
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference * (1 - clamped / 100);
  const center = dimension / 2;

  return (
    <div
      className={isHero ? styles.hero : styles.compact}
      style={{ width: dimension, height: dimension }}
    >
      {isHero && <div className={styles.glow} aria-hidden="true" />}
      <svg
        width={dimension}
        height={dimension}
        viewBox={`0 0 ${dimension} ${dimension}`}
        role="img"
        aria-label={`${Math.round(clamped)}% complete`}
      >
        <circle
          className={styles.track}
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--border-strong)"
          strokeWidth={strokeWidth}
        />
        <circle
          className={styles.arc}
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          /* Semantic inks are volt/success in dark mode, so dark is unchanged. */
          stroke={clamped >= 100 ? "var(--success-ink)" : "var(--volt-ink)"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
        />
      </svg>
      <div className={styles.center}>
        <div className={isHero ? styles.numberHero : styles.numberCompact}>
          {Math.round(clamped)}%
        </div>
        {isHero && sublabel && <div className={styles.sub}>{sublabel}</div>}
      </div>
    </div>
  );
}
