import { isVisible, JOINTS, type BodySide, type Landmark2D, type Landmark3D } from "./geometry";
import { ANGLE_FILTER_OPTIONS, createOneEuroFilter, fusedJointAngle, type JointTrio } from "./filters";
import { evaluateRep, FORM_FLAGS, hipsSagFlag, type Exercise, type FormFlag } from "./form";

/**
 * Joint angles for COUNTING use 2D image landmarks, not worldLandmarks.
 * Benchmarked on real clips (5-rep loops, clean / grainy / 2x speed / half
 * depth): 3D world angles dropped push-ups from 5/5 to 2-3/5 and fast
 * push-ups to 0/5, and raised a false "chest up" on clean front-view squats —
 * the model's metric depth for a side-on elbow is noisier than the image
 * angle, and the thresholds are 2D-calibrated. The 3D path stays in
 * geometry.ts (jointAngle/angle3D) for a future, re-benchmarked use; the
 * update() signature still accepts worldLandmarks so callers needn't change.
 */
const USE_WORLD_FOR_ANGLES = false;

export type { Exercise, FormFlag } from "./form";
export type { Landmark2D, Landmark3D } from "./geometry";

export type Phase = "up" | "down" | "not-visible";

export interface CounterState {
  reps: number;
  /** `timestampMs` of every counted rep, in order — uncounted attempts are
   *  left out, so a saved session can describe its own pacing. */
  repTimes: number[];
  phase: Phase;
  /** Filtered joint angle in degrees; null until a usable frame arrives. */
  angle: number | null;
  flags: FormFlag[];
  // New telemetry is OPTIONAL on the type so existing UI state literals that
  // initialise a CounterState keep compiling; createCounter always fills it.
  /** 0–100 per counted rep: depth against a fixed ideal, plus symmetry. */
  repQuality?: number[];
  /** Average ms per rep over the last three reps; null with < 2 reps. */
  tempoMs?: number | null;
  /** 0–1 live progress from the lockout to the required bottom. */
  depth?: number | null;
  side?: BodySide | "both" | null;
}

export interface Counter {
  update(
    landmarks: readonly Landmark2D[],
    timestampMs: number,
    worldLandmarks?: readonly Landmark3D[] | null,
  ): CounterState;
}

/** A flicker cannot count: the bottom must be held for at least this long. */
const MIN_REP_MS = 600;
/** A long pause followed by standing up is a new attempt, never one slow rep. */
const MAX_ATTEMPT_MS = 12_000;
/** A top angle that stays this far short of lockout earns a (non-blocking) cue. */
const SHORT_TOP_MS = 500;
const LOCKOUT_SHORTFALL = 15;
/** Calibration can lower the top threshold, but never below this. */
const MIN_LOCKOUT = 145;
/** Fixed form standards: calibration may never make depth easier to reach. */
const IDEAL_BOTTOM = { pushups: 70, squats: 90 } as const;

const LIMITS = {
  pushups: { down: 90, up: 155, attempt: 120, pass: 100 },
  squats: { down: 100, up: 160, attempt: 130, pass: 110 },
} as const;

const TRIO: Record<Exercise, JointTrio> = {
  pushups: { left: [11, 13, 15], right: [12, 14, 16] },
  squats: { left: [23, 25, 27], right: [24, 26, 28] },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Pure calibration policy, exported for unit tests. Only the LOCKOUT adapts;
 *  the depth thresholds in LIMITS/IDEAL_BOTTOM are form standards and never do. */
export function calibrateLockout(observedTopAngles: readonly number[], defaultUp: number): number {
  if (observedTopAngles.length < 2) return defaultUp;
  return clamp(Math.min(...observedTopAngles) - 8, MIN_LOCKOUT, defaultUp);
}

/** Torso lean from vertical: 0 is upright, > 50 is a rounded-back squat.
 *  World landmarks are metric so the same lean reads correctly from any
 *  camera angle; the 2D fallback only runs when world points are missing. */
function torsoLean(
  landmarks: readonly Landmark2D[],
  worldLandmarks: readonly Landmark3D[] | null | undefined,
  side: BodySide,
): number | null {
  const joints = JOINTS[side];
  const shoulder = landmarks[joints.shoulder];
  const hip = landmarks[joints.hip];
  if (!isVisible(shoulder) || !isVisible(hip)) return null;

  const world = worldLandmarks?.[joints.shoulder];
  const worldHip = worldLandmarks?.[joints.hip];
  if (world && worldHip && isVisible(world) && isVisible(worldHip)) {
    const dx = worldHip.x - world.x;
    const dy = worldHip.y - world.y;
    const dz = worldHip.z - world.z;
    const length = Math.hypot(dx, dy, dz);
    if (length < 1e-6) return null;
    // abs() makes leaning toward or away from the camera the same fault.
    return (Math.acos(clamp(Math.abs(dy) / length, -1, 1)) * 180) / Math.PI;
  }

  const dx = hip.x - shoulder.x;
  const dy = hip.y - shoulder.y;
  if (Math.hypot(dx, dy) < 1e-6) return null;
  return (Math.atan2(Math.abs(dx), Math.abs(dy)) * 180) / Math.PI;
}

/**
 * Deterministic rep state machine: no React, no timers, no side effects.
 *
 * 3D joint angles (when MediaPipe supplies world landmarks) drive the phase;
 * both sides are fused before filtering so an occluded arm/leg cannot cause a
 * side-switch spike. One Euro replaces the old EMA: it smooths a still pose
 * yet follows a fast descent without the lag that made shallow reps slip past.
 *
 * Depth limits are form standards and NEVER adapt. Only the top (lockout)
 * threshold is calibrated, and only after two counted reps, so a person who
 * can't reach 160° can still train instead of being stuck at zero — without
 * being able to teach the counter to accept half squats.
 */
export function createCounter(exercise: Exercise): Counter {
  const limits = LIMITS[exercise];
  const filter = createOneEuroFilter(ANGLE_FILTER_OPTIONS);
  let reps = 0;
  let repTimes: number[] = [];
  let repQuality: number[] = [];
  let topAngles: number[] = [];
  let lockout: number = limits.up;
  let posePhase: "up" | "down" = "up";
  let visible = false;
  let side: BodySide | "both" | null = null;
  let smoothed: number | null = null;
  let depth: number | null = null;
  let attempting = false;
  let attemptStart = 0;
  let attemptMin = Infinity;
  let attemptMax = 0;
  let bottomAt: number | null = null;
  let shortTopSince: number | null = null;
  /** After a timed-out attempt, wait for an actual stand-up before re-arming. */
  let awaitingReset = false;
  let symmetrySum = 0;
  let symmetryFrames = 0;
  let flags: FormFlag[] = [];
  let lastTimestamp = -Infinity;

  function addFlag(candidate: FormFlag | null) {
    if (candidate && !flags.some((flag) => flag.id === candidate.id)) {
      flags = [...flags, candidate];
    }
  }

  function resetAttempt(keepFlags = false) {
    attempting = false;
    attemptMin = Infinity;
    attemptMax = 0;
    bottomAt = null;
    shortTopSince = null;
    symmetrySum = 0;
    symmetryFrames = 0;
    posePhase = "up";
    // Coaching from the finished rep stays visible until the next attempt
    // starts; a rejected flicker clears it because there is no rep to coach.
    if (!keepFlags) flags = [];
  }

  function tempo(): number | null {
    if (repTimes.length < 2) return null;
    const last = repTimes.length - 1;
    // With 3+ reps, average the two most recent inter-rep intervals.
    if (repTimes.length === 2) return repTimes[1] - repTimes[0];
    return Math.round((repTimes[last] - repTimes[last - 2]) / 2);
  }

  function snapshot(): CounterState {
    return {
      reps,
      repTimes,
      phase: visible ? posePhase : "not-visible",
      angle: smoothed,
      flags,
      repQuality,
      tempoMs: tempo(),
      depth,
      side,
    };
  }

  function completeRep(timestampMs: number, shortLockout: boolean) {
    const result = evaluateRep(exercise, attemptMin);
    if (result.counted) {
      const depthScore = clamp(
        (limits.pass - attemptMin) / (limits.pass - IDEAL_BOTTOM[exercise]),
        0,
        1,
      );
      // Symmetry only exists when both sides were seen; a one-sided rep is
      // scored on depth alone rather than being punished for an occlusion.
      const symmetryScore =
        symmetryFrames > 0 ? clamp(1 - symmetrySum / symmetryFrames / 25, 0, 1) : null;
      const quality =
        symmetryScore === null ? depthScore * 100 : (0.8 * depthScore + 0.2 * symmetryScore) * 100;

      reps += 1;
      repTimes = [...repTimes, timestampMs];
      repQuality = [...repQuality, Math.round(clamp(quality, 0, 100))];
      topAngles = [...topAngles, attemptMax];
      lockout = calibrateLockout(topAngles, limits.up);
      if (shortLockout) addFlag(FORM_FLAGS.lockout);
    }
    // An uncounted attempt still gets its coaching flag.
    addFlag(result.flag);
    resetAttempt(true);
  }

  return {
    update(landmarks, timestampMs, worldLandmarks) {
      // A duplicated or out-of-order rAF timestamp must never advance the machine.
      // Frame throttling is the caller's job; only ordering matters here.
      if (!Number.isFinite(timestampMs) || timestampMs <= lastTimestamp) return snapshot();
      lastTimestamp = timestampMs;

      const fused = fusedJointAngle(landmarks, USE_WORLD_FOR_ANGLES ? worldLandmarks : null, TRIO[exercise]);
      if (!fused) {
        visible = false;
        side = null;
        depth = null;
        return snapshot();
      }

      smoothed = filter.filter(fused.angle, timestampMs);
      visible = true;
      side = fused.side;
      depth = clamp((lockout - smoothed) / (lockout - limits.down), 0, 1);

      if (awaitingReset) {
        // The abandoned descent must not become a rep when they finally stand.
        if (smoothed > limits.attempt) awaitingReset = false;
        return snapshot();
      }

      // A forgiving entry threshold lets a shallow attempt be observed and
      // flagged even though it never reaches the strict "down" phase.
      if (!attempting) {
        if (smoothed < limits.attempt) {
          attempting = true;
          attemptStart = timestampMs;
          attemptMin = smoothed;
          attemptMax = smoothed;
          bottomAt = smoothed < limits.down ? timestampMs : null;
          flags = []; // each new rep starts with fresh coaching
        }
        return snapshot();
      }

      // Someone paused mid-set and stood up: that is not one 12-second rep.
      if (timestampMs - attemptStart > MAX_ATTEMPT_MS) {
        resetAttempt();
        awaitingReset = true;
        return snapshot();
      }

      attemptMin = Math.min(attemptMin, smoothed);
      attemptMax = Math.max(attemptMax, smoothed);
      if (fused.side === "both" && fused.symmetry !== null) {
        symmetrySum += fused.symmetry;
        symmetryFrames += 1;
      }

      // Phase is driven by the filtered metric angle, never by raw image data.
      // `bottomAt` is stamped on the ENTERING frame only: updating it on every
      // deep frame would shorten a normal rep by the filter's descent lag.
      if (smoothed < limits.down) {
        if (posePhase !== "down") bottomAt = timestampMs;
        posePhase = "down";
      } else if (smoothed > limits.attempt && posePhase === "down") {
        posePhase = "up";
      }

      // Sag and torso lean stay in 2D where they are about the image: which
      // way the hips/chest lean relative to the frame's vertical.
      if (exercise === "pushups" && posePhase === "down") {
        addFlag(hipsSagFlag(landmarks, side === "right" ? "right" : "left"));
      }
      if (exercise === "squats" && posePhase === "down") {
        const lean = torsoLean(landmarks, USE_WORLD_FOR_ANGLES ? worldLandmarks : null, side === "right" ? "right" : "left");
        if (lean !== null && lean > 50) addFlag(FORM_FLAGS.chestUp);
      }

      const sinceBottom = timestampMs - (bottomAt ?? attemptStart);
      if (smoothed > lockout) {
        // Reaching the top closes the attempt. If it took under 600ms this was
        // a flicker: drop it now so standing still can't rescue it later.
        if (sinceBottom >= MIN_REP_MS) completeRep(timestampMs, false);
        else resetAttempt();
        return snapshot();
      }

      // A rep that returns and plateaues well short of lockout still counts
      // when its depth was good, but earns a cue to finish the movement.
      const nearLockout = lockout - smoothed <= LOCKOUT_SHORTFALL;
      if (nearLockout) {
        shortTopSince = null;
      } else if (smoothed > limits.attempt) {
        // Shallow attempts that never reach the "down" phase still return here,
        // so their coaching flag (and any short-lockout cue) is not lost.
        if (shortTopSince === null) shortTopSince = timestampMs;
        else if (timestampMs - shortTopSince >= SHORT_TOP_MS) {
          if (sinceBottom >= MIN_REP_MS) completeRep(timestampMs, true);
          else resetAttempt();
        }
      } else {
        shortTopSince = null;
      }

      return snapshot();
    },
  };
}
