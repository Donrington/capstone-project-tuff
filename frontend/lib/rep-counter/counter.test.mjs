import assert from "node:assert/strict";
import test from "node:test";
import { createCounter } from "./counter.ts";

/** Build a full PoseLandmarker-shaped frame whose tracked joint angle is exact. */
function frameFor(exercise, degrees, visible = true) {
  const visibility = visible ? 1 : 0.2;
  const landmarks = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility }));
  const radians = (degrees * Math.PI) / 180;
  const reach = 0.12;
  const bent = {
    x: 0.5 + reach * Math.sin(radians),
    y: 0.5 - reach * Math.cos(radians),
  };

  if (exercise === "squats") {
    // Angle is hip(23)–knee(25)–ankle(27).
    for (const hip of [23, 24]) landmarks[hip] = { x: 0.5, y: 0.38, visibility };
    for (const knee of [25, 26]) landmarks[knee] = { x: 0.5, y: 0.5, visibility };
    for (const ankle of [27, 28]) landmarks[ankle] = { ...bent, visibility };
  } else {
    // Angle is shoulder(11)–elbow(13)–wrist(15). Hips and ankles stay in a
    // straight line so the sagging check can't fire in these clean frames.
    for (const shoulder of [11, 12]) landmarks[shoulder] = { x: 0.5, y: 0.38, visibility };
    for (const elbow of [13, 14]) landmarks[elbow] = { x: 0.5, y: 0.5, visibility };
    for (const wrist of [15, 16]) landmarks[wrist] = { ...bent, visibility };
    for (const hip of [23, 24]) landmarks[hip] = { x: 0.5, y: 0.62, visibility };
    for (const ankle of [27, 28]) landmarks[ankle] = { x: 0.5, y: 0.9, visibility };
  }

  return landmarks;
}

function feed(counter, exercise, angles) {
  let state;
  angles.forEach((degrees, index) => {
    state = counter.update(frameFor(exercise, degrees), (index + 1) * (1000 / 30));
  });
  return state;
}

const repeat = (angles, times) => Array.from({ length: times }, () => angles).flat();
const squatRep = [...Array(12).fill(170), ...Array(14).fill(80), ...Array(14).fill(170)];
const shallowSquat = [...Array(12).fill(170), ...Array(14).fill(120), ...Array(14).fill(170)];
const pushupRep = [...Array(12).fill(170), ...Array(14).fill(70), ...Array(14).fill(170)];
const jitter = Array.from({ length: 60 }, (_, index) => (index % 2 === 0 ? 159 : 161));

test("three clean squats count three reps", () => {
  const state = feed(createCounter("squats"), "squats", repeat(squatRep, 3));
  assert.equal(state.reps, 3);
  assert.equal(state.phase, "up");
  assert.deepEqual(state.flags, []);
});

test("jitter around the up threshold does not add reps", () => {
  const counter = createCounter("squats");
  feed(counter, "squats", repeat(squatRep, 3));
  const state = feed(counter, "squats", jitter);
  assert.equal(state.reps, 3);
});

test("two shallow squats count nothing and flag the depth", () => {
  const state = feed(createCounter("squats"), "squats", repeat(shallowSquat, 2));
  assert.equal(state.reps, 0);
  assert.deepEqual(
    state.flags.map((flag) => flag.id),
    ["shallow"],
  );
});

test("three clean pushups count three reps", () => {
  const state = feed(createCounter("pushups"), "pushups", repeat(pushupRep, 3));
  assert.equal(state.reps, 3);
  assert.deepEqual(state.flags, []);
});

test("low visibility reports not-visible without changing the count", () => {
  const counter = createCounter("squats");
  feed(counter, "squats", squatRep);
  const hidden = counter.update(frameFor("squats", 80, false), 10000);
  assert.equal(hidden.phase, "not-visible");
  assert.equal(hidden.reps, 1);
});
