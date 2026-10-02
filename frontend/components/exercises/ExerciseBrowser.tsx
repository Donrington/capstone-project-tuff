"use client";

import { useState } from "react";
import Link from "next/link";
import { EXERCISE_CATEGORIES, exercises, type ExerciseCategory } from "@/data/exercises";
import { ExerciseMedia } from "./ExerciseMedia";
import styles from "./exercises.module.css";

type Filter = "All" | ExerciseCategory;

/** Category chips filter the grid on the client — it's a small, static list. */
export function ExerciseBrowser() {
  const [filter, setFilter] = useState<Filter>("All");
  const shown = filter === "All" ? exercises : exercises.filter((e) => e.category === filter);

  return (
    <>
      <div className={styles.filters} role="group" aria-label="Filter by category">
        {(["All", ...EXERCISE_CATEGORIES] as Filter[]).map((c) => (
          <button
            key={c}
            type="button"
            className={styles.filter}
            aria-pressed={filter === c}
            onClick={() => setFilter(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {shown.length} {shown.length === 1 ? "exercise" : "exercises"}
      </p>
      <ul className={styles.grid}>
        {shown.map((e) => (
          <li key={e.slug}>
            <Link href={`/exercises/${e.slug}`} className={styles.card}>
              <ExerciseMedia exercise={e} />
              <div className={styles.cardBody}>
                <p className={styles.category}>{e.category}</p>
                <h2 className={styles.cardTitle}>{e.name}</h2>
                <p className={styles.summary}>{e.summary}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
