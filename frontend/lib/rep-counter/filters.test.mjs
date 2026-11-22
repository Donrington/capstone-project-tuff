import assert from "node:assert/strict";
import test from "node:test";
import { createOneEuroFilter, fusedJointAngle } from "./filters.ts";

function variance(values) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
}

/** Deterministic noise so the jitter test can't pass by luck. */
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function setArm(points, side, degrees, visibility) {
  const [shoulder, elbow, wrist] = side === "left" ? [11, 13, 15] : [12, 14, 16];
  const radians = (degrees * Math.PI) / 180;
  points[shoulder] = { x: 0.5, y: 0.38, visibility };
  points[elbow] = { x: 0.5, y: 0.5, visibility };
  points[wrist] = {
    x: 0.5 + 0.12 * Math.sin(radians),
    y: 0.5 - 0.12 * Math.cos(radians),
    visibility,
  };
}

function frame(leftDegrees, rightDegrees, leftVisibility = 1, rightVisibility = 1) {
  const points = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 1 }));
  setArm(points, "left", leftDegrees, leftVisibility);
  setArm(points, "right", rightDegrees, rightVisibility);
  return points;
}

const ELBOWS = { left: [11, 13, 15], right: [12, 14, 16] };

test("One Euro cuts jitter variance on a noisy constant joint angle", () => {
  const random = seededRandom(0x2f6e2b1);
  const raw = [];
  const filtered = [];
  const filter = createOneEuroFilter();
  for (let index = 0; index < 180; index++) {
    const value = 100 + (random() - 0.5) * 8;
    const timestamp = (index + 1) * (1000 / 30);
    raw.push(value);
    filtered.push(filter.filter(value, timestamp));
  }
  // Ignore the first few settling frames; the steady state is what matters.
  const rawTail = raw.slice(30);
  const filteredTail = filtered.slice(30);
  assert.ok(
    variance(filteredTail) < variance(rawTail) * 0.35,
    `raw variance ${variance(rawTail).toFixed(3)}, filtered ${variance(filteredTail).toFixed(3)}`,
  );
});

test("One Euro has less lag than the old EMA on a step", () => {
  const filter = createOneEuroFilter();
  let ema = 0;
  let firstStep = null;
  let firstEma = null;
  for (let index = 0; index < 12; index++) {
    const value = index === 0 ? 0 : 100;
    const timestamp = index * (1000 / 30);
    const oneEuro = filter.filter(value, timestamp);
    if (index === 1) {
      firstStep = oneEuro;
      firstEma = ema + 0.4 * (value - ema);
    }
    ema = ema + 0.4 * (value - ema);
  }
  assert.ok(firstStep > firstEma + 15, `One Euro ${firstStep}, EMA ${firstEma}`);
  assert.ok(filter.filter(100, 12 * (1000 / 30) + 1000 / 30) > 99);
});

test("bilateral fusion uses the visibility-weighted mean, then one visible side", () => {
  const both = fusedJointAngle(frame(100, 140), null, ELBOWS);
  assert.equal(both.side, "both");
  assert.ok(Math.abs(both.angle - 120) < 0.01);
  assert.ok(Math.abs(both.symmetry - 40) < 0.01);

  const weighted = fusedJointAngle(frame(100, 140, 0.6, 1), null, ELBOWS);
  assert.ok(Math.abs(weighted.angle - 125) < 0.01, `weighted angle ${weighted.angle}`);

  const leftOnly = fusedJointAngle(frame(100, 140, 1, 0.2), null, ELBOWS);
  assert.equal(leftOnly.side, "left");
  assert.ok(Math.abs(leftOnly.angle - 100) < 0.01);
  assert.equal(leftOnly.symmetry, null);

  const rightOnly = fusedJointAngle(frame(100, 140, 0.2, 1), null, ELBOWS);
  assert.equal(rightOnly.side, "right");
  assert.ok(Math.abs(rightOnly.angle - 140) < 0.01);

  assert.equal(fusedJointAngle(frame(100, 140, 0.2, 0.2), null, ELBOWS), null);
});
