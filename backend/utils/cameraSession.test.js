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

function hold(overrides = {}) {
  return {
    value: 10,
    unit: "seconds",
    session: {
      exercise: "plank",
      durationMs: 12_000,
      segmentsMs: [[500, 10_500]],
    },
    ...overrides,
  };
}

test("a valid plank hold passes", () => {
  assert.equal(validateCameraSession(hold()), null);
});

test("two ordered, non-overlapping segments pass", () => {
  const input = hold({
    session: { exercise: "plank", durationMs: 12_000, segmentsMs: [[500, 4_500], [5_000, 11_000]] },
  });
  assert.equal(validateCameraSession(input), null);
});

test("overlapping hold segments fail", () => {
  const input = hold({
    session: { exercise: "plank", durationMs: 11_000, segmentsMs: [[1_000, 6_000], [5_000, 10_000]] },
  });
  assert.match(validateCameraSession(input), /don't look right/);
});

test("a value larger than the held time fails", () => {
  const input = hold({
    value: 10,
    session: { exercise: "plank", durationMs: 6_000, segmentsMs: [[500, 5_500]] },
  });
  assert.match(validateCameraSession(input), /don't match the camera session/);
});

test("segments shorter than 500ms fail", () => {
  const input = hold({
    session: { exercise: "plank", durationMs: 12_000, segmentsMs: [[500, 900], [1_000, 10_500]] },
  });
  assert.match(validateCameraSession(input), /too short/);
});

test("plank with unit reps fails", () => {
  const input = hold({ unit: "reps" });
  assert.match(validateCameraSession(input), /only valid with seconds/);
});

test("a reps exercise with unit seconds fails", () => {
  const input = hold({ session: { exercise: "squats", durationMs: 12_000, segmentsMs: [[500, 10_500]] } });
  assert.match(validateCameraSession(input), /count plank holds/);
});

