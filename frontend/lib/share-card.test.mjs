import assert from "node:assert/strict";
import test from "node:test";
import {
  CAMERA_LINE,
  CARD_KICKER_CHALLENGE,
  CARD_KICKER_STREAK,
  SHARE_CARD_FOOTER,
  challengeCardCopy,
  challengeWinFromDetail,
  formatCardCount,
  firstNameFrom,
  shareCardUnit,
  streakCardCopy,
} from "./share-card.ts";

function activity({ isCurrentUser = true, value = 80, day = 1, source } = {}) {
  return {
    isCurrentUser,
    value,
    source,
    recordedAt: `2026-01-${String(day).padStart(2, "0")}T12:00:00.000Z`,
  };
}

function detail({ current = 400, goal = 400, dayIndex = 5, activities = [], contributions = [], teamId = null } = {}) {
  return {
    challenge: { title: "Squats Power Week", unit: "reps", current, goal, dayIndex, teamId },
    activities,
    contributions,
  };
}

test("a challenge win uses the current user's own total, days and camera entries", () => {
  const win = challengeWinFromDetail(
    detail({
      activities: [
        activity({ value: 80, day: 1 }),
        activity({ value: 80, day: 2 }),
        activity({ value: 80, day: 3, source: "camera" }),
        activity({ value: 80, day: 4 }),
        activity({ value: 80, day: 5 }),
        activity({ isCurrentUser: false, value: 500, day: 5, source: "camera" }),
      ],
    }),
  );

  assert.deepEqual(win, { total: 400, days: 5, cameraCounted: true, teamTotal: null });
  assert.equal(challengeWinFromDetail(detail({ activities: [activity({ value: 399 })] })), null);
  assert.equal(
    challengeWinFromDetail(detail({ activities: [activity({ isCurrentUser: false, source: "camera" })] })),
    null,
  );
});

test("a finished team challenge is a win for everyone who put in — showing only their own part", () => {
  const finished = detail({
    teamId: "t1",
    current: 900,
    goal: 800,
    contributions: [
      { isCurrentUser: false, total: 600 },
      { isCurrentUser: true, total: 300 },
    ],
  });
  // The big number is the user's 300, never the team's 900.
  assert.deepEqual(challengeWinFromDetail(finished), { total: 300, days: 5, cameraCounted: false, teamTotal: 900 });

  const copy = challengeCardCopy({ title: "Squats Power Week", total: 300, unit: "reps", days: 5, firstName: "Ada", teamTotal: 900 });
  assert.equal(copy.kicker, "Team challenge complete");
  assert.equal(copy.number, "300");
  assert.match(copy.detail, /^My part of the team's 900 reps · in 5 days$/);

  // Team not there yet → no win, however much this user did.
  const unfinished = detail({ teamId: "t1", current: 700, goal: 800, contributions: [{ isCurrentUser: true, total: 700 }] });
  assert.equal(challengeWinFromDetail(unfinished), null);

  // Team finished but this user logged nothing → no win.
  const passenger = detail({
    teamId: "t1",
    current: 900,
    goal: 800,
    contributions: [
      { isCurrentUser: false, total: 900 },
      { isCurrentUser: true, total: 0 },
    ],
  });
  assert.equal(challengeWinFromDetail(passenger), null);
});

test("challenge copy carries the total, unit, title, day line and camera label", () => {
  const copy = challengeCardCopy({
    title: "Squats Power Week",
    total: 400,
    unit: "reps",
    days: 5,
    firstName: "Kelechi",
    cameraCounted: true,
  });

  assert.equal(copy.kicker, CARD_KICKER_CHALLENGE);
  assert.equal(copy.number, "400");
  assert.equal(copy.unit, "reps");
  assert.equal(copy.title, "Squats Power Week");
  assert.equal(copy.detail, "in 5 days");
  assert.equal(copy.cameraLine, CAMERA_LINE);
  assert.equal(copy.firstName, "Kelechi");
});

test("challenge copy singularises one rep, one day and omits empty lines", () => {
  const copy = challengeCardCopy({ title: "One Rep", total: 1, unit: "reps", days: 1, firstName: "Ada" });

  assert.equal(copy.unit, "rep");
  assert.equal(copy.detail, "in 1 day");
  assert.equal(copy.cameraLine, null);
  assert.equal(
    challengeCardCopy({ title: "New", total: 12, unit: "seconds", days: 0, firstName: "Ada" }).detail,
    null,
  );
});

test("card numbers are grouped for reading", () => {
  assert.equal(formatCardCount(1234567), "1,234,567");
  assert.equal(shareCardUnit(2, "squats"), "squats");
  assert.equal(shareCardUnit(1, "squats"), "squat");
  assert.equal(shareCardUnit(1, "burpees"), "burpee");
});

test("streak copy reads naturally for one day and many days", () => {
  const one = streakCardCopy({ days: 1, firstName: "Ada" });
  assert.equal(one.kicker, CARD_KICKER_STREAK);
  assert.equal(one.number, "1");
  assert.equal(one.unit, "day");
  assert.equal(one.line, "1 day in a row on TUFF");

  const many = streakCardCopy({ days: 9, firstName: "Kelechi" });
  assert.equal(many.number, "9");
  assert.equal(many.unit, "days");
  assert.equal(many.line, "9 days in a row on TUFF");
  assert.equal(many.firstName, "Kelechi");
  assert.equal(SHARE_CARD_FOOTER, "thetuffapp.com");
});

test("first name comes from the display name without extra spaces", () => {
  assert.equal(firstNameFrom("Kelechi Obi"), "Kelechi");
  assert.equal(firstNameFrom("  Ada   Nwosu "), "Ada");
});
