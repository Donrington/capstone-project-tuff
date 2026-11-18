import { Dumbbell, Footprints, Timer, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { joinSuggestedChallengeAction } from "@/app/(app)/actions";
import { getExercise } from "@/data/exercises";
import type { SuggestedChallenge } from "@/lib/types";
import styles from "./StartChallenge.module.css";

const ICON: Record<string, LucideIcon> = { steps: Footprints, reps: Dumbbell, seconds: Timer };

/** The featured slot on a brand-new dashboard: three ready-made challenges. */
export function StartChallenge({ suggestions }: { suggestions: SuggestedChallenge[] }) {
  const pilates = suggestions.filter((s) => getExercise(s.activity)?.category === "Pilates");
  const other = suggestions.filter((s) => getExercise(s.activity)?.category !== "Pilates");
  // Three rows fit the tile. Keep one Pilates starter in view when there are
  // more suggestions than rows, without hard-coding a template id here.
  const shown = [...other.slice(0, 2), ...pilates.slice(0, 1)].slice(0, 3);
  for (const s of suggestions) {
    if (shown.length >= 3) break;
    if (!shown.includes(s)) shown.push(s);
  }

  return (
    <section className={styles.wrap} aria-labelledby="start-heading">
      <p className={styles.kicker}>Get going</p>
      <h2 id="start-heading" className={styles.title}>
        Start your first challenge
      </h2>
      <ul className={styles.list}>
        {shown.map((s) => {
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
