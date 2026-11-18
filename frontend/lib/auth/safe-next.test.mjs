import assert from "node:assert/strict";
import test from "node:test";
import { safeNext } from "./safe-next.ts";

test("accepts only canonical /join/CODE destinations", () => {
  assert.equal(safeNext("/join/ABC123"), "/join/ABC123");
  assert.equal(safeNext("/join/a1"), "/join/a1");
  assert.equal(safeNext(`/join/${"A".repeat(32)}`), `/join/${"A".repeat(32)}`);
});

test("rejects absolute, protocol-relative, encoded and traversal URLs", () => {
  const hostile = [
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "/join/ABC/../../x",
    "/join/abc?x=1",
    "/dashboard",
    "%2F%2Fevil.com",
    "/join/",
    `/join/${"A".repeat(33)}`,
    "/join/ABC#frag",
  ];
  for (const value of hostile) assert.equal(safeNext(value), null, value);
});

test("rejects non-strings", () => {
  for (const value of [null, undefined, 1, {}, ["/join/ABC"]]) {
    assert.equal(safeNext(value), null);
  }
});
