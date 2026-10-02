import type { CSSProperties } from "react";
import { Avatar } from "@/components/ui/Avatar";
import type { MemberContribution } from "@/lib/types";
import styles from "./challenge.module.css";

/** Who put in what, highest first. You in volt, everyone else in gray. */
export function MemberBreakdown({ contributions, unit }: { contributions: MemberContribution[]; unit: string }) {
  const top = Math.max(...contributions.map((c) => c.total), 1);

  return (
    <section className={styles.panel} aria-labelledby="breakdown-heading">
      <div className={styles.panelHead}>
        <h2 id="breakdown-heading" className={styles.panelTitle}>
          Member breakdown
        </h2>
      </div>
      <ul className={styles.bars}>
        {contributions.map((c) => (
          <li key={c.person.id} className={`${styles.barRow} ${c.isCurrentUser ? styles.mine : ""}`}>
            <Avatar initials={c.person.initials} size="sm" photoUrl={c.person.profilePicture} />
            <div className={styles.barBody}>
              <div className={styles.barLabel}>
                <span className={styles.barName}>
                  {c.person.name}
                  {c.isCurrentUser && " (You)"}
                </span>
                <span className={styles.barValue}>
                  {c.total.toLocaleString("en-US")} {unit}
                  <span className={styles.barShare}> · {Math.round(c.share * 100)}%</span>
                </span>
              </div>
              <div className={styles.barTrack} aria-hidden="true">
                <div className={styles.barFill} style={{ "--w": `${(c.total / top) * 100}%` } as CSSProperties} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
