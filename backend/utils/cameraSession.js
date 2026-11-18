const { capFor } = require("./activityLimits");

/** The browser counts on the user's device, so the server can't prove a rep
 *  happened — but it can reject a session that no camera could have produced.
 *  These bounds are deliberately generous: real sets are slow, and only an
 *  impossible pace or a broken payload gets turned away. */
const MIN_DURATION_MS = 1000;
const MAX_DURATION_MS = 2 * 60 * 60 * 1000;
const MIN_REP_GAP_MS = 800;
const MIN_MS_PER_REP = 1000;
/** A hold must last long enough to be a hold, and each credited stretch too. */
const MIN_HOLD_SECONDS = 5;
const MIN_SEGMENT_MS = 500;

const EXERCISES = new Set(["pushups", "squats"]);

/** The reps rules are unchanged: reps arrive as offsets from session start. */
function validateReps(value, session) {
  if (!session || !EXERCISES.has(session.exercise)) return "Camera sessions count push-ups or squats.";

  const cap = capFor("reps");
  if (!Number.isInteger(value) || value < 1) return "Log at least one rep.";
  if (value > cap) {
    return `That's more than one session allows (max ${cap.toLocaleString("en-US")} reps).`;
  }

  const { durationMs, repOffsetsMs } = session;
  if (!Number.isFinite(durationMs) || durationMs < MIN_DURATION_MS || durationMs > MAX_DURATION_MS) {
    return "The session length doesn't look right — try again.";
  }
  if (!Array.isArray(repOffsetsMs)) return "The camera didn't record any reps to save.";
  if (repOffsetsMs.length !== value) return "The rep count doesn't match the camera session — try again.";

  let previous = null;
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

/** `segmentsMs` is an ordered list of [start, end] offsets from session start. */
function validateHold(value, session) {
  if (!session || session.exercise !== "plank") return "Camera sessions count plank holds.";

  const cap = capFor("seconds");
  if (!Number.isInteger(value) || value < MIN_HOLD_SECONDS) return `Hold at least ${MIN_HOLD_SECONDS} seconds.`;
  if (cap !== undefined && value > cap) {
    return `That's more than one session allows (max ${cap.toLocaleString("en-US")} seconds).`;
  }

  const { durationMs, segmentsMs } = session;
  if (!Number.isFinite(durationMs) || durationMs < MIN_DURATION_MS || durationMs > MAX_DURATION_MS) {
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

/**
 * `session` carries the browser's raw evidence: { exercise, durationMs } plus
 * either repOffsetsMs or segmentsMs. Returns a short message for the user, or
 * null when the session is plausible. Pure: no DB, no dates, no rounding —
 * the controller stores only the summary.
 */
function validateCameraSession({ value, unit, session } = {}) {
  if (session?.exercise === "plank" && unit === "reps") {
    return "Plank holds are only valid with seconds.";
  }
  if (unit === "seconds") return validateHold(value, session);
  if (unit !== "reps") return "Camera counting only saves reps or timed holds.";
  return validateReps(value, session);
}

module.exports = { validateCameraSession };
