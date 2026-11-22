import assert from "node:assert/strict";
import test from "node:test";
import { angle, angle3D, jointAngle } from "./geometry.ts";

function rotateY(point, radians) {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: point.x * cos + point.z * sin,
    y: point.y,
    z: -point.x * sin + point.z * cos,
  };
}

test("3D joint angle survives a whole-skeleton rotation; the 2D angle does not", () => {
  const skeleton = {
    a: { x: 0, y: 0, z: 0 },
    b: { x: 0.4, y: 0, z: 0 },
    c: { x: 0.4, y: 0.3, z: 0.5 },
  };
  const radians = (40 * Math.PI) / 180;
  const rotated = {
    a: rotateY(skeleton.a, radians),
    b: rotateY(skeleton.b, radians),
    c: rotateY(skeleton.c, radians),
  };

  assert.ok(Math.abs(angle3D(skeleton.a, skeleton.b, skeleton.c) - angle3D(rotated.a, rotated.b, rotated.c)) < 1e-9);
  const before2D = angle(skeleton.a, skeleton.b, skeleton.c);
  const after2D = angle(rotated.a, rotated.b, rotated.c);
  assert.ok(Math.abs(before2D - after2D) > 10, `2D angle barely changed: ${before2D} -> ${after2D}`);
});

test("jointAngle prefers metric world landmarks and falls back to 2D", () => {
  const flat = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 1 }));
  flat[11] = { x: 0.5, y: 0.3, visibility: 1 };
  flat[13] = { x: 0.5, y: 0.5, visibility: 1 };
  flat[15] = { x: 0.6, y: 0.6, visibility: 1 };
  const fallback = jointAngle(flat, null, 11, 13, 15);

  const world = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility: 1 }));
  world[11] = { x: 0, y: 0, z: 0, visibility: 1 };
  world[13] = { x: 0.4, y: 0, z: 0, visibility: 1 };
  world[15] = { x: 0.4, y: 0.4, z: 0, visibility: 1 };
  const metric = jointAngle(flat, world, 11, 13, 15);

  assert.ok(Math.abs(metric - 90) < 1e-9, `metric angle ${metric}`);
  assert.ok(Math.abs(metric - fallback) > 1);
});
