import { capFor } from "@/lib/activity-limits";

export interface CameraSessionInput {
  exercise?: string;
  durationMs?: number;
  repOffsetsMs?: number[];
  /** [start, end] offsets from session start, one per credited hold stretch. */
  segmentsMs?: Array<[number, number]>;
}

/**
 * Ported from backend/utils/cameraSession.js — keep the two in sync. The mock
 * data source runs the same plausibility rules as the Express backend so demo
 * mode rejects the same impossible sessions. Pure: no browser or DB access.
 */
const MIN_DURATION_MS = 1000;
const MAX_DURATION_MS = 2 * 60 * 60 * 1000;
const MIN_REP_GAP_MS = 800;
const MIN_MS_PER_REP = 1000;
const MIN_HOLD_SECONDS = 5;
const MIN_SEGMENT_MS = 500;

const EXERCISES = new Set(["pushups", "squats"]);

/** Returns a short message for the user, or null when the session is plausible. */
export function validateCameraSession({
  value,
  unit,
  session,
}: {
  value: number;
  unit: string;
  session?: CameraSessionInput;
}): string | null {
  if (session?.exercise === "plank" && unit === "reps") {
    return "Plank holds are only valid with seconds.";
  }
  if (unit === "seconds") return validateHold(value, session);
  if (unit !== "reps") return "Camera counting only saves reps or timed holds.";
  if (!session || !session.exercise || !EXERCISES.has(session.exercise)) {
    return "Camera sessions count push-ups or squats.";
  }

  const cap = capFor("reps");
  if (!Number.isInteger(value) || value < 1) return "Log at least one rep.";
  if (cap !== undefined && value > cap) {
    return `That's more than one session allows (max ${cap.toLocaleString("en-US")} reps).`;
  }

  const { durationMs, repOffsetsMs } = session;
  if (
    durationMs === undefined ||
    !Number.isFinite(durationMs) ||
    durationMs < MIN_DURATION_MS ||
    durationMs > MAX_DURATION_MS
  ) {
    return "The session length doesn't look right — try again.";
  }
  if (!Array.isArray(repOffsetsMs)) return "The camera didn't record any reps to save.";
  if (repOffsetsMs.length !== value) return "The rep count doesn't match the camera session — try again.";

  let previous: number | null = null;
  for (const offset of repOffsetsMs) {
    if (!Number.isFinite(offset) || offset < 0 || offset > durationMs) {
      return "Those reps came faster than a camera can count — try again.";
    }
    if (previous === null ? offset < MIN_REP_GAP_MS : offset - previous < MIN_REP_GAP_MS) {
      return "Those reps came faster than a camera can count — try again.";
    }
    previous = offset;
  }

  if (value > durationMs / MIN_MS_PER_REP) {
    return "That's faster than one rep a second — a camera couldn't count it.";
  }
  return null;
}

/** Ordered [start, end] stretches; only their total is trusted as seconds. */
function validateHold(value: number, session?: CameraSessionInput): string | null {
  if (!session || session.exercise !== "plank") return "Camera sessions count plank holds.";

  const cap = capFor("seconds");
  if (!Number.isInteger(value) || value < MIN_HOLD_SECONDS) return `Hold at least ${MIN_HOLD_SECONDS} seconds.`;
  if (cap !== undefined && value > cap) {
    return `That's more than one session allows (max ${cap.toLocaleString("en-US")} seconds).`;
  }

  const { durationMs, segmentsMs } = session;
  if (
    durationMs === undefined ||
    !Number.isFinite(durationMs) ||
    durationMs < MIN_DURATION_MS ||
    durationMs > MAX_DURATION_MS
  ) {
    return "The session length doesn't look right — try again.";
  }
  if (!Array.isArray(segmentsMs) || segmentsMs.length === 0) {
    return "The camera didn't record any held time to save.";
  }

  let heldMs = 0;
  let previousEnd = 0;
  for (const segment of segmentsMs) {
    if (!Array.isArray(segment) || segment.length !== 2) {
      return "The hold segments don't look right — try again.";
    }
    const [start, end] = segment;
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      end <= start ||
      start < 0 ||
      end > durationMs ||
      start < previousEnd
    ) {
      return "The hold segments don't look right — try again.";
    }
    if (end - start < MIN_SEGMENT_MS) return "The hold segments are too short — try again.";
    heldMs += end - start;
    previousEnd = end;
  }

  if (Math.floor(heldMs / 1000) !== value) {
    return "The seconds don't match the camera session — try again.";
  }
  return null;
}
