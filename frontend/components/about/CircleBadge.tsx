import { Check } from "lucide-react";
import styles from "./CircleBadge.module.css";

// Two passes round the circle. The trailing "• " makes the seam read like
// every other break in the ring.
const RING_TEXT = "EVERY REP COUNTS • TOGETHER • EVERY REP COUNTS • TOGETHER • ";

/**
 * A slowly turning ring of text around the logo's volt check. Decorative, so
 * it's hidden from screen readers; the same words are in the page's copy.
 * The path id is fixed, so render it once per page.
 */
export function CircleBadge({ className }: { className?: string }) {
  return (
    <div className={[styles.badge, className].filter(Boolean).join(" ")} aria-hidden="true">
      <svg className={styles.ring} viewBox="0 0 200 200">
        <defs>
          <path id="about-badge-circle" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
        </defs>
        {/* textLength stretches the words to meet exactly at the seam (the
            circle is 2πr ≈ 490 units round). */}
        <text className={styles.text}>
          <textPath href="#about-badge-circle" textLength="488" lengthAdjust="spacing">
            {RING_TEXT}
          </textPath>
        </text>
      </svg>
      <span className={styles.core}>
        <Check size={28} strokeWidth={3} />
      </span>
    </div>
  );
}
