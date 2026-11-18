import { exercisesForFilter } from "@/data/exercises";
import { ExerciseCard } from "./ExerciseCard";
import { ExerciseFilters } from "./ExerciseFilters";
import styles from "./exercises.module.css";

/** The list stays on the server; only the chips navigate to a new URL. */
export function ExerciseBrowser({ active }: { active: string }) {
  const shown = exercisesForFilter(active);

  return (
    <>
      <div className={styles.filters}>
        <ExerciseFilters active={active} />
      </div>
      <p className="sr-only" aria-live="polite">
        {shown.length} {shown.length === 1 ? "exercise" : "exercises"}
      </p>
      <ul className={styles.grid}>
        {shown.map((e) => (
          <li key={e.slug}>
            <ExerciseCard exercise={e} />
          </li>
        ))}
      </ul>
    </>
  );
}
