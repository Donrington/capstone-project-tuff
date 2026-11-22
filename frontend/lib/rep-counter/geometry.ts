/**
 * Pure geometry for the rep counter. MediaPipe hands us plain normalised
 * points (image space) plus metric world points, so nothing here imports React
 * or the pose runtime — the same code runs in the browser and under node:test
 * with synthetic landmarks.
 */

export interface Landmark2D {
  x: number;
  y: number;
  /** MediaPipe supplies this; synthetic test frames may leave it out. */
  visibility?: number;
}

/**
 * MediaPipe's `worldLandmarks`: metric (metres), hip-centred coordinates.
 * `visibility` is present on real results but optional so synthetic frames can
 * omit it. Angles between three world points describe the actual joint in the
 * body's frame, not its projection on the camera sensor.
 */
export interface Landmark3D {
  x: number;
  y: number;
  z: number;
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

/** The same angle in metric 3D space — invariant to camera orbit and zoom. */
export function angle3D(a: Landmark3D, b: Landmark3D, c: Landmark3D): number {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const abz = a.z - b.z;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const cbz = c.z - b.z;
  const magnitude = Math.hypot(abx, aby, abz) * Math.hypot(cbx, cby, cbz);

  if (magnitude === 0) return NaN;
  const cosine = (abx * cbx + aby * cby + abz * cbz) / magnitude;
  return (Math.acos(Math.min(1, Math.max(-1, cosine))) * 180) / Math.PI;
}

export function isVisible(
  point: Landmark2D | Landmark3D | undefined,
  threshold = VISIBILITY_THRESHOLD,
): point is Landmark2D | Landmark3D {
  return (
    !!point &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    (point.visibility ?? 1) >= threshold
  );
}

/** World points have a z coordinate; keep the 2D visibility check honest. */
export function isVisible3D(
  point: Landmark3D | undefined,
  threshold = VISIBILITY_THRESHOLD,
): point is Landmark3D {
  return isVisible(point, threshold) && Number.isFinite((point as Landmark3D | undefined)?.z);
}

/**
 * Track whichever body side has all six joints confidently visible. Scoring
 * the full side avoids flipping between left and right mid-rep when one arm
 * or leg is briefly occluded. Kept unchanged for the existing UI's overlay.
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

/**
 * Joint angle helper: metric 3D whenever the runtime supplied usable world
 * landmarks, otherwise the legacy image-space angle. Camera-facing tilt is
 * deliberately NOT handled here — the plank overlay still measures that with
 * raw 2D landmarks (see hold.ts), because tilt is a property of the image.
 */
export function jointAngle(
  landmarks: readonly Landmark2D[],
  worldLandmarks: readonly Landmark3D[] | null | undefined,
  a: number,
  b: number,
  c: number,
): number {
  const points = [landmarks[a], landmarks[b], landmarks[c]];
  if (!points.every((point) => isVisible(point))) return NaN;

  const world = worldLandmarks && [worldLandmarks[a], worldLandmarks[b], worldLandmarks[c]];
  if (world && world.every((point) => isVisible3D(point))) {
    const metric = world as Landmark3D[];
    const measured = angle3D(metric[0], metric[1], metric[2]);
    if (Number.isFinite(measured)) return measured;
  }
  return angle(points[0] as Landmark2D, points[1] as Landmark2D, points[2] as Landmark2D);
}
