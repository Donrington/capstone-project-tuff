/**
 * Pure 2D geometry for the rep counter. MediaPipe hands us plain normalised
 * points, so nothing here imports React or the pose runtime — the same code
 * runs in the browser and under node:test with synthetic landmarks.
 */

export interface Landmark2D {
  x: number;
  y: number;
  /** MediaPipe supplies this; synthetic test frames may leave it out. */
  visibility?: number;
}

/** Below this the pose runtime isn't confident enough to drive the counter. */
export const VISIBILITY_THRESHOLD = 0.5;

/** PoseLandmarker's indices for the joints we track. */
export const JOINTS = {
  left: { shoulder: 11, elbow: 13, wrist: 15, hip: 23, knee: 25, ankle: 27 },
  right: { shoulder: 12, elbow: 14, wrist: 16, hip: 24, knee: 26, ankle: 28 },
} as const;

export type BodySide = keyof typeof JOINTS;

/** Angle at joint `b` (a–b–c), in degrees, from 2D landmarks. */
export function angle(a: Landmark2D, b: Landmark2D, c: Landmark2D): number {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const magnitude = Math.hypot(abx, aby) * Math.hypot(cbx, cby);

  // Coincident joints have no angle; callers treat NaN as "not visible".
  if (magnitude === 0) return NaN;
  const cosine = (abx * cbx + aby * cby) / magnitude;
  // Floating-point drift can push the dot product just outside acos's domain.
  return (Math.acos(Math.min(1, Math.max(-1, cosine))) * 180) / Math.PI;
}

export function isVisible(
  point: Landmark2D | undefined,
  threshold = VISIBILITY_THRESHOLD,
): point is Landmark2D {
  return (
    !!point &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    (point.visibility ?? 1) >= threshold
  );
}

/**
 * Track whichever body side has all six joints confidently visible. Scoring
 * the full side avoids flipping between left and right mid-rep when one arm
 * or leg is briefly occluded.
 */
export function pickVisibleSide(landmarks: readonly Landmark2D[]): BodySide | null {
  const score = (side: BodySide) => {
    const indices = Object.values(JOINTS[side]);
    if (!indices.every((index) => isVisible(landmarks[index]))) return 0;
    return indices.reduce((total, index) => total + (landmarks[index].visibility ?? 1), 0);
  };

  const left = score("left");
  const right = score("right");
  if (left === 0 && right === 0) return null;
  return right > left ? "right" : "left";
}
