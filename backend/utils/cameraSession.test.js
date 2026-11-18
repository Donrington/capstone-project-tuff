const test = require("node:test");
const assert = require("node:assert/strict");
const { validateCameraSession } = require("./cameraSession");

function session(overrides = {}) {
  return {
    value: 3,
    unit: "reps",
    session: {
      exercise: "squats",
      durationMs: 5000,
      repOffsetsMs: [1000, 2500, 4000],
    },
    ...overrides,
  };
}

test("a clean camera session passes", () => {
  assert.equal(validateCameraSession(session()), null);
});

test("a gap under 800ms fails", () => {
  const problem = validateCameraSession(session({ session: { exercise: "squats", durationMs: 5000, repOffsetsMs: [1000, 1500, 4000] } }));
  assert.match(problem, /faster than a camera can count/);
});

test("the first rep under 800ms fails", () => {
  const problem = validateCameraSession(session({ session: { exercise: "squats", durationMs: 5000, repOffsetsMs: [500, 2500, 4000] } }));
  assert.match(problem, /faster than a camera can count/);
});

test("a rep count that doesn't match the offsets fails", () => {
  const problem = validateCameraSession(session({ value: 3, session: { exercise: "squats", durationMs: 5000, repOffsetsMs: [1000, 2500] } }));
  assert.match(problem, /doesn't match/);
});

test("offsets that don't increase fail", () => {
  const problem = validateCameraSession(session({ session: { exercise: "squats", durationMs: 5000, repOffsetsMs: [1000, 1000, 4000] } }));
  assert.match(problem, /faster than a camera can count/);
});

test("a unit other than reps fails", () => {
  const problem = validateCameraSession({ ...session(), unit: "steps" });
  assert.match(problem, /only saves reps/);
});

test("a faster-than-one-per-second average fails", () => {
  const problem = validateCameraSession(session({ value: 6, session: { exercise: "squats", durationMs: 5000, repOffsetsMs: [800, 1600, 2400, 3200, 4000, 4800] } }));
  assert.match(problem, /one rep a second/);
});
