import assert from "node:assert/strict";
import test from "node:test";
import { coverTransform, mapCoverPoint } from "./cover.ts";

const close = (actual, expected, label) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${label}: expected ${expected}, got ${actual}`);

test("portrait video in a portrait stage: horizontal crop, mirrored", () => {
  const transform = coverTransform({ width: 720, height: 1280 }, { width: 390, height: 720 });
  close(transform.scale, 720 / 1280, "scale");
  close(transform.offsetX, -7.5, "offsetX");
  close(transform.offsetY, 0, "offsetY");

  const centre = mapCoverPoint({ x: 0.5, y: 0.5 }, transform);
  close(centre.x, 195, "centre x");
  close(centre.y, 360, "centre y");

  // Mirroring swaps which raw side a landmark lands on, but the y stays put.
  const leftShoulder = mapCoverPoint({ x: 0.25, y: 0.25 }, transform);
  const rightShoulder = mapCoverPoint({ x: 0.75, y: 0.25 }, transform);
  close(leftShoulder.x, 296.25, "mirrored left shoulder x");
  close(rightShoulder.x, 93.75, "mirrored right shoulder x");
  close(leftShoulder.y, 180, "shoulder y");
});

test("landscape video in a portrait stage: vertical crop with visible offsets", () => {
  const transform = coverTransform({ width: 1280, height: 720 }, { width: 390, height: 720 });
  close(transform.scale, 1, "scale");
  close(transform.offsetX, -445, "offsetX");
  close(transform.offsetY, 0, "offsetY");

  // A point outside the crop maps outside the stage — expected for cover.
  const cropped = mapCoverPoint({ x: 0, y: 0.5 }, transform);
  close(cropped.x, 835, "cropped point x");
  close(mapCoverPoint({ x: 0.5, y: 0.5 }, transform).x, 195, "centre x");
});

test("landscape video in a wider stage crops vertically", () => {
  const transform = coverTransform({ width: 640, height: 480 }, { width: 800, height: 600 });
  close(transform.scale, 1.25, "scale");
  close(transform.offsetX, 0, "offsetX");
  close(transform.offsetY, 0, "offsetY");
  close(mapCoverPoint({ x: 0, y: 0 }, transform, { mirror: false }).y, 0, "top y");
  close(mapCoverPoint({ x: 1, y: 1 }, transform, { mirror: false }).x, 800, "right x");
});

test("pixel ratio scales canvas coordinates without changing the layout maths", () => {
  const transform = coverTransform({ width: 720, height: 1280 }, { width: 390, height: 720 });
  const point = mapCoverPoint({ x: 0.5, y: 0.5 }, transform, { pixelRatio: 3 });
  close(point.x, 585, "device x");
  close(point.y, 1080, "device y");
  close(mapCoverPoint({ x: 0.5, y: 0.5 }, transform, { mirror: false }).x, 195, "unmirrored x");
});

test("missing or zero dimensions never produce NaN", () => {
  const transform = coverTransform({ width: 0, height: 0 }, { width: 0, height: 0 });
  const point = mapCoverPoint({ x: 0.4, y: 0.6 }, transform);
  assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
});
