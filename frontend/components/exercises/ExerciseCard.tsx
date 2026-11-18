import Link from "next/link";
import type { Exercise } from "@/data/exercises";
import { ExerciseMedia } from "./ExerciseMedia";
import styles from "./exercises.module.css";

/**
 * The card is shared so the featured mat row and the full list stay in sync.
 * `label` lets the featured row show the move's place in the sequence.
 */
export function ExerciseCard({
  exercise,
  label,
  headingLevel = "h2",
}: {
  exercise: Exercise;
  label?: string;
  headingLevel?: "h2" | "h3";
}) {
  const Title = headingLevel;

  return (
    <Link href={`/exercises/${exercise.slug}`} className={styles.card}>
      <ExerciseMedia exercise={exercise} />
      <div className={styles.cardBody}>
        <p className={styles.category}>{label ?? exercise.category}</p>
        <Title className={styles.cardTitle}>{exercise.name}</Title>
        <p className={styles.summary}>{exercise.summary}</p>
      </div>
    </Link>
  );
}
