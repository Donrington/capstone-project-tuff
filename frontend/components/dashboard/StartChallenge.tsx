import { Dumbbell, Footprints, Timer, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { joinSuggestedChallengeAction } from "@/app/(app)/actions";
import type { SuggestedChallenge } from "@/lib/types";
import styles from "./StartChallenge.module.css";

const ICON: Record<string, LucideIcon> = { steps: Footprints, reps: Dumbbell, seconds: Timer };

/** The featured slot on a brand-new dashboard: three ready-made challenges. */
export function StartChallenge({ suggestions }: { suggestions: SuggestedChallenge[] }) {
  return (
    <section className={styles.wrap} aria-labelledby="start-heading">
      <p className={styles.kicker}>Get going</p>
      <h2 id="start-heading" className={styles.title}>
        Start your first challenge
      </h2>
      <ul className={styles.list}>
        {suggestions.map((s) => {
          const Icon = ICON[s.unit] ?? Dumbbell;
          return (
            <li key={s.id} className={styles.item}>
              <span className={styles.icon} aria-hidden="true">
                <Icon size={18} strokeWidth={2.25} />
              </span>
              <span className={styles.text}>
                <strong>{s.title}</strong>
                <span>{s.description}</span>
              </span>
              <form action={joinSuggestedChallengeAction.bind(null, s.id)}>
                <Button type="submit" variant="secondary" aria-label={`Start ${s.title}`}>
                  Start
                </Button>
              </form>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
