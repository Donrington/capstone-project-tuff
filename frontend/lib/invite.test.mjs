import assert from "node:assert/strict";
import test from "node:test";
import { inviteDetail } from "./invite.ts";

const preview = (endDate) => ({
  kind: "challenge",
  title: "Step streak",
  goal: 10000,
  unit: "steps",
  endDate,
  inviterFirstName: "Ada",
});

test("invite labels a stored day key as a calendar label", () => {
  assert.equal(inviteDetail(preview("2026-04-01"), "Pacific/Kiritimati"), "10,000 steps · ends Apr 1");
});

test("invite steps an exclusive backend instant back in the viewer's zone", () => {
  // 00:00 in Los Angeles on the exclusive end day is 07:00Z.
  assert.equal(inviteDetail(preview("2026-04-01T07:00:00.000Z"), "America/Los_Angeles"), "10,000 steps · ends Mar 31");
});

test("invite detail ignores an unparseable end date", () => {
  assert.equal(inviteDetail(preview("not-a-date"), "UTC"), "10,000 steps");
});
