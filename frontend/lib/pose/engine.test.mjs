import assert from "node:assert/strict";
import test from "node:test";
import { chooseTier, shouldDowngrade } from "./engine.ts";
import { SLOW_FRAME_MS, SLOW_FRAME_SAMPLES } from "./tier.ts";

test("chooseTier requires GPU plus cores and memory for auto-full", () => {
  assert.equal(chooseTier({ gpuAvailable: true, hardwareConcurrency: 8, deviceMemory: 8 }), "full");
  assert.equal(chooseTier({ gpuAvailable: true, hardwareConcurrency: 4, deviceMemory: 8 }), "lite");
  assert.equal(chooseTier({ gpuAvailable: true, hardwareConcurrency: 8, deviceMemory: 2 }), "lite");
  assert.equal(chooseTier({ gpuAvailable: false, hardwareConcurrency: 16, deviceMemory: 16 }), "lite");
  // Browsers that don't report capabilities fall back to conservative values.
  assert.equal(chooseTier({ gpuAvailable: true }), "lite");
});

test("chooseTier honours an explicit preference", () => {
  assert.equal(chooseTier({ preferTier: "full", gpuAvailable: false }), "full");
  assert.equal(
    chooseTier({ preferTier: "lite", gpuAvailable: true, hardwareConcurrency: 16, deviceMemory: 16 }),
    "lite",
  );
});

test("shouldDowngrade needs a full window and an average above budget", () => {
  assert.equal(shouldDowngrade(Array(SLOW_FRAME_SAMPLES - 1).fill(200)), false);
  assert.equal(shouldDowngrade(Array(SLOW_FRAME_SAMPLES).fill(SLOW_FRAME_MS)), false); // strictly greater
  assert.equal(shouldDowngrade(Array(SLOW_FRAME_SAMPLES).fill(SLOW_FRAME_MS + 0.1)), true);
  assert.equal(shouldDowngrade(Array(SLOW_FRAME_SAMPLES).fill(12)), false);
  // Only the trailing 30 frames count: an early stall must not force lite.
  const mixed = [...Array(SLOW_FRAME_SAMPLES).fill(200), ...Array(SLOW_FRAME_SAMPLES).fill(10)];
  assert.equal(shouldDowngrade(mixed), false);
  assert.equal(shouldDowngrade([...mixed.slice(0, 5), 60, ...Array(SLOW_FRAME_SAMPLES - 1).fill(45)]), true);
});
