import {
  angle,
  isVisible,
  JOINTS,
  pickVisibleSide,
  type Landmark2D,
} from "./geometry";
import type { FormFlag } from "./form";

export interface HoldSegment {
  /** Milliseconds on the same clock as `update`'s `timestampMs`. */
  startMs: number;
  endMs: number;
}

export type HoldPhase = "holding" | "broken" | "not-visible";

export interface HoldState {
  heldMs: number;
  holding: boolean;
  phase: HoldPhase;
  /** Smoothed shoulder–hip–ankle angle in degrees; null until a usable frame. */
  angle: number | null;
  flags: FormFlag[];
  /** One entry per continuous holding stretch, in time order. */
  segments: HoldSegment[];
}

export interface HoldTimer {
  update(landmarks: readonly Landmark2D[], timestampMs: number): HoldState;
}

/** One copy of each plank cue, shared by the timer and the screen-reader callout. */
export const HOLD_FLAGS = {
  // From a side-on camera, y grows downward, so the hip's position relative
  // to the shoulder–ankle line tells sag from pike — unlike the angle alone.
  hipsDropping: { id: "hips-dropping", message: "Hips dropping — squeeze your glutes" },
  hipsTooHigh: { id: "hips-too-high", message: "Hips too high — lower to a straight line" },
  notHorizontal: { id: "not-horizontal", message: "Get down into your plank" },
  notSupported: { id: "not-supported", message: "Push up onto your forearms or hands" },
} as const;

/** The server rejects shorter stretches, so the timer never keeps one. */
export const MIN_SEGMENT_MS = 500;
/** How far below the shoulder the supporting elbow/wrist must be, as a share
 *  of shoulder-to-hip length. Lying flat on the floor also makes a straight,
 *  horizontal shoulder-hip-ankle line — the arms holding the body up are what
 *  make it a plank. A forearm plank puts the elbow about an upper arm below. */
const MIN_SUPPORT_RATIO = 0.25;

const EMA_ALPHA = 0.4;
const STRAIGHT_ANGLE = 160;
const MAX_TILT_DEG = 35;
/** Debounce windows: slow to credit a hold, slow to take one away. */
const START_HOLD_MS = 500;
const BREAK_HOLD_MS = 400;
const DEGENERATE = 1e-6;

/** Angle between the shoulder→ankle vector and either horizontal direction. */
function tiltFromHorizontal(shoulder: Landmark2D, ankle: Landmark2D): number {
  const dx = ankle.x - shoulder.x;
  const dy = ankle.y - shoulder.y;
  if (Math.abs(dx) < DEGENERATE && Math.abs(dy) < DEGENERATE) return NaN;
  return (Math.atan2(Math.abs(dy), Math.abs(dx)) * 180) / Math.PI;
}

/** y of the shoulder–ankle line at the hip's x — the reference for sag vs pike. */
function lineYAt(shoulder: Landmark2D, ankle: Landmark2D, x: number): number {
  const dx = ankle.x - shoulder.x;
  // An upright frame has no run to interpolate along; use the midpoint.
  if (Math.abs(dx) < DEGENERATE) return (shoulder.y + ankle.y) / 2;
  return shoulder.y + ((x - shoulder.x) * (ankle.y - shoulder.y)) / dx;
}

/** Is the body held up on forearms or hands? y grows downward, so a
 *  supporting elbow/wrist has a larger y than the shoulder. */
function isSupported(shoulder: Landmark2D, hip: Landmark2D, elbow: Landmark2D, wrist: Landmark2D): boolean {
  const torso = Math.hypot(hip.x - shoulder.x, hip.y - shoulder.y);
  if (!(torso > DEGENERATE)) return false;
  const drops = [elbow, wrist].filter(isVisible).map((joint) => joint.y - shoulder.y);
  return drops.length > 0 && Math.max(...drops) >= MIN_SUPPORT_RATIO * torso;
}

function formFlags(
  smoothedAngle: number,
  tilt: number,
  supported: boolean,
  shoulder: Landmark2D,
  hip: Landmark2D,
  ankle: Landmark2D,
): FormFlag[] {
  const flags: FormFlag[] = [];
  if (!(tilt <= MAX_TILT_DEG)) flags.push(HOLD_FLAGS.notHorizontal);
  else if (!supported) flags.push(HOLD_FLAGS.notSupported);
  if (smoothedAngle < STRAIGHT_ANGLE) {
    flags.push(hip.y > lineYAt(shoulder, ankle, hip.x) ? HOLD_FLAGS.hipsDropping : HOLD_FLAGS.hipsTooHigh);
  }
  return flags;
}

/**
 * Deterministic hold state machine: no React, no timers, no side effects.
 * `heldMs` is derived from the recorded segments, so the timer the user sees
 * and the segments saved with the session can never disagree.
 */
export function createHoldTimer(exercise: string): HoldTimer {
  if (exercise !== "plank") throw new Error(`Unsupported hold exercise: ${exercise}`);

  let lastTimestamp = -Infinity;
  let smoothed: number | null = null;
  let segments: HoldSegment[] = [];
  let holding = false;
  let goodSince: number | null = null;
  let badSince: number | null = null;
  let phase: HoldPhase = "not-visible";
  let flags: FormFlag[] = [];

  function snapshot(): HoldState {
    return {
      heldMs: segments.reduce((total, segment) => total + (segment.endMs - segment.startMs), 0),
      holding,
      phase,
      angle: smoothed,
      flags,
      segments,
    };
  }

  return {
    update(landmarks, timestampMs) {
      // A duplicated or out-of-order rAF timestamp must never advance the machine.
      if (!Number.isFinite(timestampMs) || timestampMs <= lastTimestamp) return snapshot();
      lastTimestamp = timestampMs;

      // A bad frame is anything that can't confirm the plank — including a
      // frame where the pose was lost, which the camera can't judge blind.
      const markBad = () => {
        goodSince = null;
        if (badSince === null) badSince = timestampMs;
      };

      let visible = false;
      let good = false;
      const side = pickVisibleSide(landmarks);
      if (side) {
        const joints = JOINTS[side];
        const shoulder = landmarks[joints.shoulder];
        const hip = landmarks[joints.hip];
        const ankle = landmarks[joints.ankle];
        // pickVisibleSide already scores the whole side; the explicit check
        // keeps the three joints this hold depends on unambiguous.
        if (isVisible(shoulder) && isVisible(hip) && isVisible(ankle)) {
          const measured = angle(shoulder, hip, ankle);
          if (Number.isFinite(measured)) {
            smoothed = smoothed === null ? measured : smoothed + EMA_ALPHA * (measured - smoothed);
            const tilt = tiltFromHorizontal(shoulder, ankle);
            const supported = isSupported(shoulder, hip, landmarks[joints.elbow], landmarks[joints.wrist]);
            good = smoothed >= STRAIGHT_ANGLE && tilt <= MAX_TILT_DEG && supported;
            flags = formFlags(smoothed, tilt, supported, shoulder, hip, ankle);
            visible = true;
          }
        }
      }

      if (!visible) {
        phase = "not-visible";
        flags = [];
        markBad();
      } else if (good) {
        // Until the start debounce clears, a good frame is still a broken hold.
        phase = holding ? "holding" : "broken";
        badSince = null;
        if (!holding) {
          if (goodSince === null) goodSince = timestampMs;
          if (timestampMs - goodSince >= START_HOLD_MS) {
            holding = true;
            goodSince = null;
            phase = "holding";
            segments = [...segments, { startMs: timestampMs, endMs: timestampMs }];
          }
        }
      } else {
        phase = "broken";
        markBad();
      }

      if (holding) {
        const open = segments[segments.length - 1];
        if (good) {
          // Only good frames extend the hold, so the stretch always ends on the
          // last frame that was actually a plank — the 400ms grace period while
          // a wobble is judged is never credited.
          segments = [...segments.slice(0, -1), { ...open, endMs: timestampMs }];
        } else if (badSince !== null && timestampMs - badSince >= BREAK_HOLD_MS) {
          holding = false;
          badSince = null;
          phase = visible ? "broken" : "not-visible";
          // A stretch too short for the server would make the whole session
          // unsavable, so a hold that breaks straight after starting is dropped.
          if (open.endMs - open.startMs < MIN_SEGMENT_MS) segments = segments.slice(0, -1);
        }
      }

      return snapshot();
    },
  };
}
