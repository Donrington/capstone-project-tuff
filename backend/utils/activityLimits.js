/** Per-entry caps for logged activity. Shared so every endpoint enforces the
 *  same limit and the UI can mirror it. */
const ACTIVITY_CAPS = {
  reps: 1000,
  steps: 100000,
  seconds: 14400,
};

function capFor(unit) {
  return ACTIVITY_CAPS[unit];
}

module.exports = { ACTIVITY_CAPS, capFor };
