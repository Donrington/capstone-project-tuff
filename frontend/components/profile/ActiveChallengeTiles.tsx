import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { challengePercent, formatCount } from "@/lib/challenge-card";
import type { Challenge } from "@/lib/types";
import styles from "./ActiveChallengeTiles.module.css";

export function ActiveChallengeTiles({ challenges }: { challenges: Challenge[] }) {
  return (
    <section className={styles.section} aria-labelledby="active-heading">
      <h2 id="active-heading" className={styles.heading}>
        Active challenges
      </h2>
      {challenges.length === 0 ? (
        <p className={styles.empty}>Nothing active right now.</p>
      ) : (
        <ul className={styles.list}>
          {challenges.map((c) => (
            <li key={c.id}>
              <Link href={`/challenges/${c.id}`} className={styles.tile}>
                <ProgressRing size="compact" percent={challengePercent(c)} />
                <span className={styles.text}>
                  <span className={styles.name}>{c.name}</span>
                  <span className={styles.meta}>
                    {formatCount(c.current)} / {formatCount(c.target)} {c.unit}
                  </span>
                </span>
                <ArrowUpRight size={16} className={styles.arrow} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
