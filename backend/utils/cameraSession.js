const { capFor } = require("./activityLimits");

/** The browser counts on the user's device, so the server can't prove a rep
 *  happened — but it can reject a session that no camera could have produced.
 *  These bounds are deliberately generous: real sets are slow, and only an
 *  impossible pace or a broken payload gets turned away. */
const MIN_DURATION_MS = 1000;
const MAX_DURATION_MS = 2 * 60 * 60 * 1000;
const MIN_REP_GAP_MS = 800;
const MIN_MS_PER_REP = 1000;

const EXERCISES = new Set(["pushups", "squats"]);

/**
 * `session` is { exercise, durationMs, repOffsetsMs }, where each offset is
 * milliseconds since the session started, one per counted rep.
 * Returns a short message for the user, or null when the session is plausible.
 * Pure: no DB, no dates, no rounding — the controller stores only the summary.
 */
function validateCameraSession({ value, unit, session } = {}) {
  if (unit !== "reps") return "Camera counting only saves reps.";
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

module.exports = { validateCameraSession };
