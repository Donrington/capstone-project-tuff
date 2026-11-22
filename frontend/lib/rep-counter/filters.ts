/**
 * Signal processing for joint angles: a timestamp-based One Euro filter and
 * visibility-weighted fusion of both body sides. No React, no MediaPipe
 * runtime — everything here is pure and node:test friendly.
 */
import {
  angle as angle2D,
  angle3D,
  isVisible,
  isVisible3D,
  type BodySide,
  type Landmark2D,
  type Landmark3D,
} from "./geometry";

export interface OneEuroOptions {
  /** Cutoff in Hz for a still signal: low enough to kill pose jitter. */
  minCutoff: number;
  /** How much speed opens the cutoff (Hz per unit/second of the derivative). */
  beta: number;
  /** Cutoff in Hz for the derivative itself: keeps beta from amplifying noise. */
  dCutoff: number;
}

/**
 * Tuned for angles in DEGREES at 20–60 fps. A still joint is estimated at
 * roughly 1 Hz (about a fifth of a second of smoothing at 30 fps), while a
 * fast rep raises the cutoff by `beta * |speed|`: a 600 deg/s elbow adds ~12 Hz
 * and follows the motion almost outright. That is the property the old fixed
 * EMA (alpha 0.4) lacked: it either lagged fast reps or passed noise through
 * when sped up. dCutoff = minCutoff so the speed estimate is not itself noisy.
 */
export const ANGLE_FILTER_OPTIONS: OneEuroOptions = {
  minCutoff: 1.0,
  beta: 0.02,
  dCutoff: 1.0,
};

export interface OneEuroFilter {
  filter(value: number, timestampMs: number): number;
  reset(): void;
}

function smoothingFactor(cutoffHz: number, deltaSeconds: number): number {
  const tau = 1 / (2 * Math.PI * cutoffHz);
  return 1 / (1 + tau / deltaSeconds);
}

/**
 * Casiez et al., "1€ Filter": two cascaded low-pass filters. The derivative
 * estimate adapts the signal cutoff to speed, so the result is frame-rate
 * independent (unlike an EMA alpha) and does not smear quick direction changes.
 */
export function createOneEuroFilter(options: Partial<OneEuroOptions> = {}): OneEuroFilter {
  const { minCutoff, beta, dCutoff } = { ...ANGLE_FILTER_OPTIONS, ...options };
  let previousValue: number | null = null;
  let previousDerivative = 0;
  let previousTime = 0;

  return {
    reset() {
      previousValue = null;
      previousDerivative = 0;
      previousTime = 0;
    },

    filter(value: number, timestampMs: number) {
      if (!Number.isFinite(value)) return previousValue ?? value;
      if (!Number.isFinite(timestampMs)) return previousValue ?? value;

      if (previousValue === null) {
        previousValue = value;
        previousTime = timestampMs;
        return value;
      }

      const deltaSeconds = (timestampMs - previousTime) / 1000;
      // Duplicate/out-of-order frames carry no new information; rAF is
      // allowed to deliver them, and a zero dt would divide by zero.
      if (!(deltaSeconds > 0)) return previousValue;

      const derivative = (value - previousValue) / deltaSeconds;
      const derivativeAlpha = smoothingFactor(dCutoff, deltaSeconds);
      const smoothedDerivative =
        derivativeAlpha * derivative + (1 - derivativeAlpha) * previousDerivative;
      const cutoff = minCutoff + beta * Math.abs(smoothedDerivative);
      const valueAlpha = smoothingFactor(cutoff, deltaSeconds);
      const smoothedValue = valueAlpha * value + (1 - valueAlpha) * previousValue;

      previousValue = smoothedValue;
      previousDerivative = smoothedDerivative;
      previousTime = timestampMs;
      return smoothedValue;
    },
  };
}

export interface SideAngle {
  value: number;
  /** Mean joint visibility: the confidence of this side's measurement. */
  visibility: number;
}

export interface FusedAngle {
  angle: number;
  side: BodySide | "both";
  /** Absolute left/right disagreement in degrees; null if only one side was seen. */
  symmetry: number | null;
}

/** The three joint indices for one side of a joint, e.g. shoulder–elbow–wrist. */
export interface JointTrio {
  left: readonly [number, number, number];
  right: readonly [number, number, number];
}

/**
 * Bilateral fusion. Two independent measurements of the same joint are better
 * than one: when a side is occluded the other keeps the counter alive, and
 * when both are present their visibility-weighted mean cancels single-side
 * landmark noise. World landmarks are preferred per side by `jointAngle`.
 */
export function fusedJointAngle(
  landmarks: readonly Landmark2D[],
  worldLandmarks: readonly Landmark3D[] | null | undefined,
  trio: JointTrio,
): FusedAngle | null {
  const measure = (indices: readonly [number, number, number]): SideAngle | null => {
    const points = [landmarks[indices[0]], landmarks[indices[1]], landmarks[indices[2]]];
    if (!points.every((point) => isVisible(point))) return null;

    const value = worldLandmarks
      ? angle3DAvailable(worldLandmarks, indices) ??
        angle2D(points[0] as Landmark2D, points[1] as Landmark2D, points[2] as Landmark2D)
      : angle2D(points[0] as Landmark2D, points[1] as Landmark2D, points[2] as Landmark2D);
    if (!Number.isFinite(value)) return null;

    const visibility =
      points.reduce((total, point) => total + ((point as Landmark2D).visibility ?? 1), 0) / 3;
    return { value, visibility };
  };

  const left = measure(trio.left);
  const right = measure(trio.right);
  if (!left && !right) return null;
  if (!left) return { angle: right!.value, side: "right", symmetry: null };
  if (!right) return { angle: left.value, side: "left", symmetry: null };

  const weight = left.visibility + right.visibility;
  return {
    angle: (left.value * left.visibility + right.value * right.visibility) / weight,
    side: "both",
    symmetry: Math.abs(left.value - right.value),
  };
}

function angle3DAvailable(
  worldLandmarks: readonly Landmark3D[],
  indices: readonly [number, number, number],
): number | null {
  const points = [worldLandmarks[indices[0]], worldLandmarks[indices[1]], worldLandmarks[indices[2]]];
  if (!points.every((point) => isVisible3D(point))) return null;
  const metric = points as Landmark3D[];
  const value = angle3D(metric[0], metric[1], metric[2]);
  return Number.isFinite(value) ? value : null;
}

/** Alias for callers that think in terms of the fusion technique. */
export const fuseBilateral = fusedJointAngle;
