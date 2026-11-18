import assert from "node:assert/strict";
import test from "node:test";
import { demoCrew, shouldShowDemoLeaderboard } from "./demo-crew.ts";

test("demo leaderboard only appears for boards with fewer than three real entries", () => {
  assert.equal(shouldShowDemoLeaderboard(0), true);
  assert.equal(shouldShowDemoLeaderboard(1), true);
  assert.equal(shouldShowDemoLeaderboard(2), true);
  assert.equal(shouldShowDemoLeaderboard(3), false);
  assert.equal(shouldShowDemoLeaderboard(10), false);
});

test("the example crew stays display-only and honestly described", () => {
  assert.equal(demoCrew.members.length, 5);
  assert.notEqual(demoCrew.name, "Demo Crew");
  for (const member of demoCrew.members) {
    assert.ok(member.initials.length > 0);
    // Initials-only avatars: an example person never gets a photo or link.
    assert.deepEqual(Object.keys(member).sort(), ["initials", "name", "streakDays", "weeklyPoints"]);
  }
  // The camera only counts push-ups, squats and planks — examples can't claim more.
  for (const line of demoCrew.activities.filter((a) => a.includes("Camera-counted"))) {
    assert.match(line, /push-ups|squats|plank/);
    assert.doesNotMatch(line, /side plank/);
  }
});
