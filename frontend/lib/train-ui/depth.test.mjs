import assert from "node:assert/strict";
import test from "node:test";
import { depthFromAngle } from "./depth.ts";

const close = (actual, expected, label) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${label}: expected ${expected}, got ${actual}`);

test("push-up depth runs from the top angle to the bottom angle", () => {
  close(depthFromAngle("pushups", 155), 0, "top");
  close(depthFromAngle("pushups", 90), 1, "bottom");
  close(depthFromAngle("pushups", 122.5), 0.5, "halfway");
});

test("squat depth uses the knee thresholds", () => {
  close(depthFromAngle("squats", 160), 0, "top");
  close(depthFromAngle("squats", 100), 1, "bottom");
  close(depthFromAngle("squats", 130), 0.5, "halfway");
});

test("out-of-range and missing angles are clamped", () => {
  close(depthFromAngle("squats", 200), 0, "above top");
  close(depthFromAngle("squats", 10), 1, "below bottom");
  close(depthFromAngle("squats", null), 0, "null");
  close(depthFromAngle("pushups", Number.NaN), 0, "NaN");
});
