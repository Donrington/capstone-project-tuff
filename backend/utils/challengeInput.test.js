const test = require("node:test");
const assert = require("node:assert/strict");
const { challengeCreateFields, challengeUpdateFields, POINTS_PER_UNIT } = require("./challengeInput");

const day = 24 * 60 * 60 * 1000;
const base = (over = {}) => ({
  title: "Squats Week",
  description: "400 squats in 7 days.",
  type: "workout",
  goal: 400,
  unit: "reps",
  startDate: new Date(Date.UTC(2026, 10, 20)).toISOString(),
  endDate: new Date(Date.UTC(2026, 10, 27)).toISOString(),
  ...over,
});
const member = { teamId: "team-a", isAdmin: false };

test("scoring comes from the unit, never from the request", () => {
  const fields = challengeCreateFields(base({ pointsPerUnit: 1_000_000_000 }), member);
  assert.equal(fields.pointsPerUnit, POINTS_PER_UNIT.reps);
  assert.equal(challengeCreateFields(base({ unit: "steps", pointsPerUnit: 99 }), member).pointsPerUnit, 0.01);
  assert.equal(challengeCreateFields(base({ unit: "kg" }), member).pointsPerUnit, 0, "unloggable units score nothing");
});

test("a team challenge can only be created for the creator's own team", () => {
  assert.equal(challengeCreateFields(base({ teamId: "team-a" }), member).teamId, "team-a");
  assert.throws(() => challengeCreateFields(base({ teamId: "team-b" }), member), /own team/);
  assert.throws(() => challengeCreateFields(base({ teamId: "team-b" }), { teamId: null, isAdmin: false }), /own team/);
});

test("status, featured, inviteCode and createdBy are not client-settable on create", () => {
  const fields = challengeCreateFields(
    base({ status: "completed", featured: true, inviteCode: "PWNED", createdBy: "someone-else" }),
    member,
  );
  for (const key of ["status", "featured", "inviteCode", "createdBy"]) assert.equal(fields[key], undefined, key);
  assert.equal(challengeCreateFields(base({ featured: true }), { teamId: null, isAdmin: true }).featured, true);
});

test("inputs are bounded", () => {
  assert.throws(() => challengeCreateFields(base({ title: "x".repeat(81) }), member), /80/);
  assert.throws(() => challengeCreateFields(base({ description: "x".repeat(501) }), member), /500/);
  assert.throws(() => challengeCreateFields(base({ goal: 0 }), member), /goal/);
  assert.throws(() => challengeCreateFields(base({ goal: 2.5 }), member), /goal/);
  assert.throws(() => challengeCreateFields(base({ goal: 1e9 }), member), /goal/);
  assert.throws(() => challengeCreateFields(base({ endDate: new Date(Date.UTC(2027, 5, 1)).toISOString() }), member), /90 days/);
  assert.throws(() => challengeCreateFields(base({ endDate: base().startDate }), member), /after start/);
  assert.throws(() => challengeCreateFields(base({ startDate: "not a date" }), member), /dates/);
  // An operator object can't survive as a query operator: it's coerced to a plain string.
  assert.equal(typeof challengeCreateFields(base({ title: { $ne: "" } }), member).title, "string");
});

test("scoring, unit and team are locked after creation", () => {
  const current = { unit: "reps", pointsPerUnit: 1, teamId: null, startDate: base().startDate, endDate: base().endDate };
  assert.throws(() => challengeUpdateFields({ pointsPerUnit: 500 }, current, { isAdmin: false }), /pointsPerUnit/);
  assert.throws(() => challengeUpdateFields({ unit: "steps" }, current, { isAdmin: false }), /unit/);
  assert.throws(() => challengeUpdateFields({ teamId: "team-b" }, current, { isAdmin: false }), /teamId/);
  // Re-sending the same values (as a full-form save would) is fine.
  assert.deepEqual(challengeUpdateFields({ unit: "reps", pointsPerUnit: 1, title: "New name" }, current, { isAdmin: false }), { title: "New name" });
});

test("a creator can cancel but not complete, and only admins feature", () => {
  const current = { unit: "reps", startDate: base().startDate, endDate: base().endDate };
  assert.equal(challengeUpdateFields({ status: "cancelled" }, current, { isAdmin: false }).status, "cancelled");
  assert.throws(() => challengeUpdateFields({ status: "completed" }, current, { isAdmin: false }), /cancelled/);
  assert.throws(() => challengeUpdateFields({ featured: true }, current, { isAdmin: false }), /admins/);
  assert.equal(challengeUpdateFields({ featured: true }, current, { isAdmin: true }).featured, true);
});

test("update dates stay within the same bounds", () => {
  const current = { unit: "reps", startDate: base().startDate, endDate: base().endDate };
  assert.throws(() => challengeUpdateFields({ endDate: new Date(Date.parse(base().startDate) + 120 * day).toISOString() }, current, { isAdmin: false }), /90 days/);
});
