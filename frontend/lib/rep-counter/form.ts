import { angle, JOINTS, type BodySide, type Landmark2D } from "./geometry";

export type Exercise = "pushups" | "squats";

export interface FormFlag {
  id: string;
  message: string;
}

/** One copy of each cue, shared by the counter and the screen-reader callout. */
export const FORM_FLAGS = {
  // The shoulder-hip-ankle angle drops for sagging *and* piked hips, and one
  // angle can't tell which — so the cue names the fix, not the fault.
  hipsSagging: { id: "hips-sagging", message: "Keep a straight line from shoulders to heels." },
  partialRep: { id: "partial-rep", message: "Go lower — chest toward the floor." },
  shallowSquat: { id: "shallow", message: "Squat deeper — hips to knee height." },
} as const;

export interface RepResult {
  counted: boolean;
  flag: FormFlag | null;
}

/** Checked on every frame of the down phase, not just at the bottom. */
export function hipsSagFlag(landmarks: readonly Landmark2D[], side: BodySide): FormFlag | null {
  const { shoulder, hip, ankle } = JOINTS[side];
  const hipAngle = angle(landmarks[shoulder], landmarks[hip], landmarks[ankle]);
  return Number.isFinite(hipAngle) && hipAngle < 160 ? FORM_FLAGS.hipsSagging : null;
}

/**
 * Decide a completed attempt from its minimum angle. The down/up thresholds
 * in the counter drive the visible phase; these (more forgiving) depth limits
 * decide whether the attempt earns a rep or a coaching flag.
 */
export function evaluateRep(exercise: Exercise, minAngle: number): RepResult {
  if (exercise === "squats") {
    return minAngle > 110
      ? { counted: false, flag: FORM_FLAGS.shallowSquat }
      : { counted: true, flag: null };
  }
  return minAngle >= 100
    ? { counted: false, flag: FORM_FLAGS.partialRep }
    : { counted: true, flag: null };
}
