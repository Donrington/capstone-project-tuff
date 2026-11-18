import { angle, JOINTS, pickVisibleSide, type Landmark2D } from "./geometry";
import { evaluateRep, hipsSagFlag, type Exercise, type FormFlag } from "./form";

export type { Exercise, FormFlag } from "./form";

export type Phase = "up" | "down" | "not-visible";

export interface CounterState {
  reps: number;
  phase: Phase;
  /** Smoothed angle in degrees; null until a usable frame arrives. */
  angle: number | null;
  flags: FormFlag[];
}

export interface Counter {
  update(landmarks: readonly Landmark2D[], timestampMs: number): CounterState;
}

const EMA_ALPHA = 0.4;

const LIMITS = {
  pushups: { down: 90, up: 155, attempt: 120 },
  squats: { down: 100, up: 160, attempt: 130 },
} as const;

/**
 * Deterministic rep state machine: no React, no timers, no side effects.
 * `down`/`up` are far apart so jitter near one edge can't bounce the phase;
 * a separate attempt (started below `attempt`, finished above `up`) records
 * the minimum angle so shallow reps can be caught instead of counted.
 */
export function createCounter(exercise: Exercise): Counter {
  const limits = LIMITS[exercise];
  let reps = 0;
  let posePhase: "up" | "down" = "up";
  let visible = false;
  let smoothed: number | null = null;
  let attempting = false;
  let attemptMin = Infinity;
  let flags: FormFlag[] = [];
  let lastTimestamp = -Infinity;

  function addFlag(candidate: FormFlag | null) {
    if (candidate && !flags.some((flag) => flag.id === candidate.id)) {
      flags = [...flags, candidate];
    }
  }

  function snapshot(): CounterState {
    return {
      reps,
      phase: visible ? posePhase : "not-visible",
      angle: smoothed,
      flags,
    };
  }

  return {
    update(landmarks, timestampMs) {
      // A duplicated or out-of-order rAF timestamp must never advance the machine.
      // Frame throttling is the caller's job; only ordering matters here.
      if (!Number.isFinite(timestampMs) || timestampMs <= lastTimestamp) return snapshot();
      lastTimestamp = timestampMs;

      const side = pickVisibleSide(landmarks);
      if (!side) {
        visible = false;
        return snapshot();
      }

      const joints = JOINTS[side];
      const measured =
        exercise === "squats"
          ? angle(landmarks[joints.hip], landmarks[joints.knee], landmarks[joints.ankle])
          : angle(landmarks[joints.shoulder], landmarks[joints.elbow], landmarks[joints.wrist]);
      if (!Number.isFinite(measured)) {
        visible = false;
        return snapshot();
      }

      visible = true;
      smoothed = smoothed === null ? measured : smoothed + EMA_ALPHA * (measured - smoothed);

      // A forgiving entry threshold lets a shallow attempt be observed and
      // flagged even though it never reaches the strict "down" phase.
      if (!attempting && smoothed < limits.attempt) {
        attempting = true;
        attemptMin = smoothed;
        flags = []; // each new rep starts with fresh coaching
      }

      if (attempting) {
        attemptMin = Math.min(attemptMin, smoothed);
        if (smoothed < limits.down) posePhase = "down";
        if (exercise === "pushups" && posePhase === "down") {
          addFlag(hipsSagFlag(landmarks, side));
        }

        if (smoothed > limits.up) {
          const result = evaluateRep(exercise, attemptMin);
          if (result.counted) reps += 1;
          addFlag(result.flag);
          attempting = false;
          attemptMin = Infinity;
          posePhase = "up";
        }
      }

      return snapshot();
    },
  };
}
