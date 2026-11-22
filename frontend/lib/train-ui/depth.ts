import type { Exercise } from "@/lib/rep-counter/counter";

/**
 * Temporary visual-only estimate of rep depth from the engine's `angle`.
 *
 * The current engine exposes an (EMA-smoothed) joint angle, not a 0–1 depth.
 * These limits mirror its down/up thresholds so the progress ring tracks the
 * movement closely. When the engine exposes its own `depth`, replace calls to
 * this helper with that value — nothing outside this file should depend on it.
 */

const LIMITS: Record<Exercise, { top: number; bottom: number }> = {
  pushups: { top: 155, bottom: 90 },
  squats: { top: 160, bottom: 100 },
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** 0 at the top of the rep, 1 at the bottom. 0 when the pose is unusable. */
export function depthFromAngle(exercise: Exercise, angle: number | null): number {
  if (angle === null || !Number.isFinite(angle)) return 0;
  const { top, bottom } = LIMITS[exercise];
  return clamp01((top - angle) / (top - bottom));
}
