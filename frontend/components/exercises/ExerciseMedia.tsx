import { Activity, Dumbbell, Flame, Footprints, PersonStanding, Spline, type LucideIcon } from "lucide-react";
import { LoopingVideo } from "@/components/about/LoopingVideo";
import type { Exercise, ExerciseCategory } from "@/data/exercises";
import styles from "./exercises.module.css";

const CATEGORY_ICON: Record<ExerciseCategory, LucideIcon> = {
  "Upper body": Dumbbell,
  "Lower body": Footprints,
  Core: PersonStanding,
  "Full body": Flame,
  Cardio: Activity,
  Pilates: Spline,
};

/**
 * The clip when there is one — looping, muted, paused off-screen, poster
 * only under reduced motion (all handled by LoopingVideo). Until the clips
 * exist, a gradient mesh with the category's icon.
 */
export function ExerciseMedia({ exercise, size = "card" }: { exercise: Exercise; size?: "card" | "hero" }) {
  const Icon = CATEGORY_ICON[exercise.category];
  return (
    <div className={`${styles.media} ${size === "hero" ? styles.mediaHero : ""}`}>
      {exercise.video ? (
        <LoopingVideo src={exercise.video.src} poster={exercise.video.poster} className={styles.video} />
      ) : (
        <div className={styles.mesh} aria-hidden="true">
          <Icon size={size === "hero" ? 64 : 36} strokeWidth={1.75} />
        </div>
      )}
    </div>
  );
}
