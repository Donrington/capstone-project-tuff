import assert from "node:assert/strict";
import test from "node:test";
import {
  addDays,
  dayKey,
  dayNumber,
  formatDay,
  formatTime,
  isValidTimeZone,
  startOfDay,
} from "./dates.ts";

test("dayKey uses the supplied zone and trims pasted names", () => {
  const instant = new Date("2026-11-22T23:30:00.000Z");
  assert.equal(dayKey(instant, "UTC"), "2026-11-22");
  assert.equal(dayKey(instant, "Africa/Lagos"), "2026-11-23");
  assert.equal(dayKey(instant, "  Africa/Lagos "), "2026-11-23");
  assert.equal(dayKey(instant, "America/Los_Angeles"), "2026-11-22");
  assert.equal(isValidTimeZone("Mars/Olympus"), false);
});

test("startOfDay resolves DST gaps and folds to a real local instant", () => {
  assert.equal(
    startOfDay(new Date("2024-07-01T16:00:00Z"), "America/New_York").toISOString(),
    "2024-07-01T04:00:00.000Z",
  );
  assert.equal(
    startOfDay(new Date("2018-11-04T12:00:00Z"), "America/Sao_Paulo").toISOString(),
    "2018-11-04T03:00:00.000Z",
  );
  assert.equal(
    startOfDay(new Date("2024-11-03T05:30:00Z"), "America/Havana").toISOString(),
    "2024-11-03T05:00:00.000Z",
  );
});

test("addDays follows the calendar, not 24-hour arithmetic", () => {
  assert.equal(
    dayKey(addDays(new Date("2024-03-10T12:00:00Z"), "America/New_York", 1), "America/New_York"),
    "2024-03-11",
  );
  assert.equal(
    dayKey(addDays(new Date("2024-11-03T12:00:00Z"), "America/New_York", 1), "America/New_York"),
    "2024-11-04",
  );
  assert.equal(dayNumber("2024-03-11") - dayNumber("2024-03-10"), 1);
});

test("formatDay and formatTime render in the user's zone", () => {
  const instant = new Date("2026-11-22T23:30:00.000Z");
  assert.equal(formatDay(instant, "Africa/Lagos", { weekday: "short" }), "Mon");
  assert.equal(formatDay(instant, "UTC", { weekday: "short" }), "Sun");
  // A day key is a calendar label, not an instant — it must not shift by zone.
  assert.equal(formatDay("2026-11-22", "Pacific/Kiritimati"), "Nov 22");
  assert.equal(formatTime(instant, "Africa/Lagos", { hour: "2-digit", minute: "2-digit", hour12: false }), "00:30");
});
