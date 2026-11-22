import assert from "node:assert/strict";
import test from "node:test";
import { createHoldTimer } from "./hold.ts";

const FRAME_MS = 1000 / 30;

/** Side-on landmarks. `hipDy` shifts the hip off the shoulder–ankle line
 *  (positive is toward the floor), which is how sag and pike are told apart. */
function plankFrame({ hipDy = 0, upright = false, visible = true, lyingFlat = false } = {}) {
  const v = visible ? 1 : 0.2;
  const landmarks = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: v }));
  const joints = upright
    ? { shoulder: 0.3, hip: 0.55, ankle: 0.8 }
    : { shoulder: 0.5, hip: 0.5 + hipDy, ankle: 0.5 };
  for (const shoulder of [11, 12]) landmarks[shoulder] = { x: upright ? 0.5 : 0.25, y: joints.shoulder, visibility: v };
  for (const hip of [23, 24]) landmarks[hip] = { x: upright ? 0.5 : 0.5, y: joints.hip, visibility: v };
  for (const ankle of [27, 28]) landmarks[ankle] = { x: upright ? 0.5 : 0.75, y: joints.ankle, visibility: v };
  // Forearm plank: elbows under the shoulders, about an upper arm lower
  // (shoulder-to-hip here is 0.25). Lying flat, the arms rest level with the
  // shoulders — the straight line is the same, the support isn't.
  const armY = upright ? 0.45 : lyingFlat ? joints.shoulder : joints.shoulder + 0.12;
  for (const elbow of [13, 14]) landmarks[elbow] = { x: upright ? 0.5 : 0.25, y: armY, visibility: v };
  for (const wrist of [15, 16]) landmarks[wrist] = { x: upright ? 0.5 : 0.18, y: armY, visibility: v };
  return landmarks;
}

/** Feed consecutive phases without gaps, so segment timestamps stay ordered. */
function run(timer, phases) {
  let now = 0;
  let state;
  for (const { frame, seconds } of phases) {
    const frames = Math.round((seconds * 1000) / FRAME_MS);
    for (let i = 0; i < frames; i++) {
      now += FRAME_MS;
      state = timer.update(frame, now);
    }
  }
  return state;
}

const steady = (seconds) => [{ frame: plankFrame(), seconds }];

test("a steady ten-second plank credits about ten seconds", () => {
  const state = run(createHoldTimer("plank"), steady(10));
  assert.equal(state.phase, "holding");
  assert.equal(state.holding, true);
  assert.ok(Math.abs(state.heldMs - 10_000) <= 600, `heldMs was ${state.heldMs}`);
  assert.equal(state.segments.length, 1);
  assert.deepEqual(state.flags, []);
});

test("a broken hold records two segments and excludes the break", () => {
  const state = run(createHoldTimer("plank"), [
    ...steady(4),
    { frame: plankFrame({ visible: false }), seconds: 2 },
    ...steady(4),
  ]);
  assert.equal(state.segments.length, 2);
  assert.ok(state.segments[0].endMs < 5_000, "first segment ends before the hold resumes");
  assert.ok(state.segments[1].startMs >= 6_000, "second segment starts after the break");
  assert.ok(state.heldMs > 6_500 && state.heldMs < 8_000, `heldMs was ${state.heldMs}`);
  assert.equal(
    Math.round(state.heldMs),
    Math.round(state.segments.reduce((sum, s) => sum + s.endMs - s.startMs, 0)),
  );
});

test("200ms of jitter doesn't break the hold", () => {
  const state = run(createHoldTimer("plank"), [
    ...steady(3),
    { frame: plankFrame({ visible: false }), seconds: 0.2 },
    ...steady(3),
  ]);
  assert.equal(state.segments.length, 1);
  assert.ok(state.heldMs > 5_400, `heldMs was ${state.heldMs}`);
  assert.equal(state.phase, "holding");
});

test("standing upright never counts as holding", () => {
  const state = run(createHoldTimer("plank"), [{ frame: plankFrame({ upright: true }), seconds: 5 }]);
  assert.equal(state.heldMs, 0);
  assert.equal(state.holding, false);
  assert.deepEqual(state.segments, []);
  assert.ok(state.flags.some((flag) => flag.id === "not-horizontal"));
});

test("sagging hips and piked hips get different cues", () => {
  const sag = run(createHoldTimer("plank"), [{ frame: plankFrame({ hipDy: 0.05 }), seconds: 1 }]);
  assert.ok(sag.flags.some((flag) => flag.message === "Hips dropping — squeeze your glutes"));
  const pike = run(createHoldTimer("plank"), [{ frame: plankFrame({ hipDy: -0.05 }), seconds: 1 }]);
  assert.ok(pike.flags.some((flag) => flag.message === "Hips too high — lower to a straight line"));
});

test("lying flat on the floor is never a plank", () => {
  const state = run(createHoldTimer("plank"), [{ frame: plankFrame({ lyingFlat: true }), seconds: 6 }]);
  assert.equal(state.holding, false);
  assert.equal(state.heldMs, 0);
  assert.deepEqual(state.flags.map((flag) => flag.id), ["not-supported"]);
});

test("a break is not credited for the time it took to confirm it", () => {
  const state = run(createHoldTimer("plank"), [
    { frame: plankFrame(), seconds: 4 },
    { frame: plankFrame({ hipDy: 0.15 }), seconds: 2 },
  ]);
  assert.equal(state.holding, false);
  // 4 s of good frames minus the 0.5 s start debounce; none of the bad run.
  assert.ok(Math.abs(state.heldMs - 3_500) <= 100, `heldMs was ${state.heldMs}`);
});

test("a hold that breaks straight after starting is dropped, not saved short", () => {
  const state = run(createHoldTimer("plank"), [
    { frame: plankFrame(), seconds: 0.7 },
    { frame: plankFrame({ hipDy: 0.15 }), seconds: 1 },
    { frame: plankFrame(), seconds: 3 },
  ]);
  for (const segment of state.segments) {
    assert.ok(segment.endMs - segment.startMs >= 500, `kept a ${segment.endMs - segment.startMs}ms segment`);
  }
  assert.equal(state.segments.length, 1);
});

test("the plank body line follows the 2D image, not world landmarks (benchmarked choice)", () => {
  // Counting and holds are 2D-only (see USE_WORLD_FOR_ANGLES): world points
  // that disagree with a straight, supported 2D plank must not break it.
  const timer = createHoldTimer("plank");
  const world = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility: 1 }));
  const radians = (120 * Math.PI) / 180;
  for (const shoulder of [11, 12]) world[shoulder] = { x: 0.4, y: 0, z: 0, visibility: 1 };
  for (const hip of [23, 24]) world[hip] = { x: 0, y: 0, z: 0, visibility: 1 };
  for (const ankle of [27, 28]) {
    world[ankle] = { x: 0.4 + 0.4 * Math.cos(radians), y: 0.4 * Math.sin(radians), z: 0, visibility: 1 };
  }
  let state;
  for (let index = 0; index < 200; index++) {
    state = timer.update(plankFrame(), (index + 1) * FRAME_MS, world);
  }
  assert.equal(state.holding, true);
  assert.ok(state.heldMs > 5_000, `heldMs was ${state.heldMs}`);
});