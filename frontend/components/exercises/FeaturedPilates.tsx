import { pilatesExercises } from "@/data/exercises";
import { ExerciseCard } from "./ExerciseCard";
import styles from "./exercises.module.css";

/** The classical order is data, so the cards and detail pages cannot drift. */
export function FeaturedPilates() {
  return (
    <section className={styles.featured} aria-labelledby="pilates-featured-title">
      <div className={styles.featuredHead}>
        <div>
          <p className={styles.featuredKicker}>Featured · Pilates</p>
          <h2 id="pilates-featured-title" className={styles.featuredTitle}>
            Pilates mat
          </h2>
        </div>
        <p className={styles.featuredIntro}>
          The classical mat sequence, one move at a time — no reformer needed.
        </p>
      </div>
      <ul className={styles.featuredRow}>
        {pilatesExercises.map((exercise, i) => (
          <li key={exercise.slug}>
            <ExerciseCard
              exercise={exercise}
              label={`Move ${i + 1} of ${pilatesExercises.length}`}
              headingLevel="h3"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
