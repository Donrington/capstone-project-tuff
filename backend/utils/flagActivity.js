/**
 * Deterministic, instant, no AI call on the write path — flagging happens
 * on every logged activity, so it has to be cheap. These thresholds sit
 * well below the hard per-unit caps the frontend already enforces (reps
 * 1000, steps 100000, seconds 3600): a flag means "an admin should glance
 * at this," not "this is rejected." The AI's job (see adminController's
 * flag explainer) is to say why, lazily, only when an admin is looking.
 */
const THRESHOLDS = {
  reps: 500,
  steps: 40_000,
  seconds: 1800,
  minutes: 180,
  km: 50,
  miles: 30,
};

/** Returns a reason string if `value value unit` looks implausible for one
 *  entry, otherwise null. */
function flagReasonFor(unit, value) {
  const limit = THRESHOLDS[unit];
  if (!limit || !(value > limit)) return null;
  return `${value.toLocaleString("en-US")} ${unit} in one entry is well past the usual range for a single entry (over ${limit.toLocaleString("en-US")}).`;
}

module.exports = { flagReasonFor };
