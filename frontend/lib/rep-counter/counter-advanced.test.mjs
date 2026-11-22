import assert from "node:assert/strict";
import test from "node:test";
import { calibrateLockout, createCounter } from "./counter.ts";

const FRAME_MS = 1000 / 30;

/** Landmarks shaped so the tracked joint reads exactly `degrees` in 2D. */
function frameFor(exercise, degrees, worldDegrees = null) {
  const landmarks = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 1 }));
  const radians = (degrees * Math.PI) / 180;
  const bent = { x: 0.5 + 0.12 * Math.sin(radians), y: 0.5 - 0.12 * Math.cos(radians) };
  if (exercise === "squats") {
    for (const hip of [23, 24]) landmarks[hip] = { x: 0.5, y: 0.38, visibility: 1 };
    for (const knee of [25, 26]) landmarks[knee] = { x: 0.5, y: 0.5, visibility: 1 };
    for (const ankle of [27, 28]) landmarks[ankle] = { ...bent, visibility: 1 };
  } else {
    for (const shoulder of [11, 12]) landmarks[shoulder] = { x: 0.5, y: 0.38, visibility: 1 };
    for (const elbow of [13, 14]) landmarks[elbow] = { x: 0.5, y: 0.5, visibility: 1 };
    for (const wrist of [15, 16]) landmarks[wrist] = { ...bent, visibility: 1 };
    for (const hip of [23, 24]) landmarks[hip] = { x: 0.5, y: 0.62, visibility: 1 };
    for (const ankle of [27, 28]) landmarks[ankle] = { x: 0.5, y: 0.9, visibility: 1 };
  }

  if (worldDegrees === null) return { landmarks, world: null };
  // Metric world landmarks with the requested 3D angle at the SAME joint on
  // both sides, so the 2D frame can be held constant to prove 3D is preferred.
  const world = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility: 1 }));
  const theta = ((180 - worldDegrees) * Math.PI) / 180;
  const points =
    exercise === "squats" ? { a: [23, 24], b: [25, 26], c: [27, 28] } : { a: [11, 12], b: [13, 14], c: [15, 16] };
  for (const index of points.a) world[index] = { x: 0, y: 0, z: 0, visibility: 1 };
  for (const index of points.b) world[index] = { x: 0.4, y: 0, z: 0, visibility: 1 };
  for (const index of points.c) {
    world[index] = { x: 0.4 + 0.4 * Math.cos(theta), y: 0.4 * Math.sin(theta), z: 0, visibility: 1 };
  }
  return { landmarks, world };
}

function feed(counter, exercise, angles, worldAngles = null, startFrame = 0) {
  let state;
  angles.forEach((degrees, index) => {
    const { landmarks, world } = frameFor(exercise, degrees, worldAngles ? worldAngles[index] : null);
    state = counter.update(landmarks, (startFrame + index + 1) * FRAME_MS, world);
  });
  return state;
}

const repeat = (angles, times) => Array.from({ length: times }, () => angles).flat();
const cleanRep = [...Array(12).fill(170), ...Array(20).fill(80), ...Array(14).fill(170)];

test("a 300ms flicker rep never counts, even if the person then stands still", () => {
  const counter = createCounter("squats");
  const flicker = [
    ...Array(12).fill(170),
    ...Array(4).fill(80), // ~133ms down
    ...Array(4).fill(170), // ~133ms up
    ...Array(40).fill(170),
  ];
  const state = feed(counter, "squats", flicker);
  assert.equal(state.reps, 0);
  assert.deepEqual(state.repTimes, []);
});

test("calibration clamps lockout at 145 and cannot weaken depth standards", () => {
  assert.equal(calibrateLockout([153, 152], 155), 145); // 152 - 8 would be 144
  assert.equal(calibrateLockout([172, 168], 160), 160); // never above the default
  assert.equal(calibrateLockout([150], 155), 155); // needs two counted reps

  const counter = createCounter("squats");
  const shallow = [...Array(12).fill(170), ...Array(20).fill(120), ...Array(20).fill(170)];
  const state = feed(counter, "squats", [...repeat(cleanRep, 2), ...shallow]);
  assert.equal(state.reps, 2, "calibration must not make a 120-degree squat count");
  assert.ok(state.flags.some((flag) => flag.id === "shallow"));
});

test("repQuality, tempoMs, depth and side report sane live values", () => {
  const counter = createCounter("squats");
  let state = feed(counter, "squats", repeat(cleanRep, 3));
  assert.equal(state.reps, 3);
  assert.equal(state.repQuality.length, 3);
  for (const quality of state.repQuality) {
    assert.ok(Number.isInteger(quality) && quality >= 0 && quality <= 100, `quality ${quality}`);
    assert.ok(quality >= 90, `clean deep reps should score well, got ${quality}`);
  }
  assert.ok(state.tempoMs !== null && state.tempoMs > 500 && state.tempoMs < 4000);
  assert.equal(state.side, "both");
  assert.ok(state.depth !== null && state.depth >= 0 && state.depth < 0.1, `top depth ${state.depth}`);

  const atBottom = feed(counter, "squats", Array(24).fill(80), null, repeat(cleanRep, 3).length);
  assert.ok(atBottom.depth !== null && atBottom.depth > 0.95, `bottom depth ${atBottom.depth}`);
});

test("a deep rep that plateaus short of lockout is counted but flagged", () => {
  const counter = createCounter("squats");
  const shortTop = [...Array(12).fill(170), ...Array(20).fill(80), ...Array(24).fill(135)];
  const state = feed(counter, "squats", shortTop);
  assert.equal(state.reps, 1, "good depth still earns the rep");
  assert.ok(state.flags.some((flag) => flag.id === "lockout"), "but the top is coached");
});

test("counting follows the 2D image angle, not world landmarks (benchmarked choice)", () => {
  // Real-clip benchmark: 3D world angles cost push-ups 2-3 of 5 reps, so
  // counting is 2D-only. World landmarks that disagree must not move it.
  const worldAngles = [...repeat([170, 80, 170], 3).flatMap((angle) => Array(20).fill(angle))];
  const still = feed(createCounter("squats"), "squats", Array(worldAngles.length).fill(170), worldAngles);
  assert.equal(still.reps, 0, "world landmarks moved the counter while the 2D angle stayed straight");
  const moving = feed(createCounter("squats"), "squats", worldAngles, Array(worldAngles.length).fill(170));
  assert.equal(moving.reps, 3, "2D reps were blocked by disagreeing world landmarks");
});

test("an attempt longer than 12 seconds is discarded, not counted as one rep", () => {
  const counter = createCounter("squats");
  const paused = [...Array(400).fill(80), ...Array(20).fill(170)]; // > 13s at the bottom
  const state = feed(counter, "squats", paused);
  assert.equal(state.reps, 0);
});
