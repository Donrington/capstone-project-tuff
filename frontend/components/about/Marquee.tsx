import styles from "./Marquee.module.css";

const ITEMS = ["Log it", "Challenge your crew", "Climb together", "Keep the streak"];

/**
 * A tilted, pill-shaped band of big type drifting sideways. Two identical
 * groups sit side by side and the track slides exactly one group's width,
 * so the loop has no visible seam. Decorative — the same ideas are in the
 * page copy — so it's hidden from screen readers.
 */
export function Marquee() {
  return (
    <div className={styles.band} aria-hidden="true">
      <div className={styles.viewport}>
        <div className={styles.track}>
          {[0, 1].map((copy) => (
            <div key={copy} className={styles.group}>
              {ITEMS.map((item, i) => (
                <span key={item} className={styles.item}>
                  <span className={i % 2 ? styles.outline : styles.solid}>{item}</span>
                  <span className={styles.star}>✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
