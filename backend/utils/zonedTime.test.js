const test = require("node:test");
const assert = require("node:assert/strict");
const {
  isValidTimeZone,
  dayKey,
  dayNumber,
  partsAt,
  startOfDay,
  addDays,
} = require("./zonedTime");

test("validates IANA zones with Intl and rejects nonsense", () => {
  assert.equal(isValidTimeZone("UTC"), true);
  assert.equal(isValidTimeZone("Africa/Lagos"), true);
  assert.equal(isValidTimeZone("America/New_York"), true);
  assert.equal(isValidTimeZone("  Africa/Lagos "), true); // pasted values get trimmed
  assert.equal(dayKey(new Date("2026-11-22T23:30:00Z"), " Africa/Lagos "), "2026-11-23");
  assert.equal(isValidTimeZone("Not/AZone"), false);
  assert.equal(isValidTimeZone(""), false);
  assert.equal(isValidTimeZone(null), false);
});

test("dayKey follows the user's zone at the UTC date boundary", () => {
  const instant = new Date("2026-11-22T23:30:00.000Z");
  assert.equal(dayKey(instant, "UTC"), "2026-11-22");
  assert.equal(dayKey(instant, "Africa/Lagos"), "2026-11-23");
  assert.equal(dayKey(instant, "America/Los_Angeles"), "2026-11-22");
  // The other edge: 00:30Z is still the previous day in the Americas.
  const early = new Date("2026-11-23T00:30:00.000Z");
  assert.equal(dayKey(early, "UTC"), "2026-11-23");
  assert.equal(dayKey(early, "America/New_York"), "2026-11-22");
});

test("startOfDay returns local midnight as a real UTC instant", () => {
  assert.equal(
    startOfDay(new Date("2026-11-22T13:45:00Z"), "UTC").toISOString(),
    "2026-11-22T00:00:00.000Z"
  );
  assert.equal(
    startOfDay(new Date("2024-07-01T16:00:00Z"), "America/New_York").toISOString(),
    "2024-07-01T04:00:00.000Z"
  );
  assert.equal(
    startOfDay(new Date("2024-01-01T16:00:00Z"), "America/New_York").toISOString(),
    "2024-01-01T05:00:00.000Z"
  );
  assert.equal(
    startOfDay(new Date("2026-01-01T12:00:00Z"), "Asia/Kathmandu").toISOString(),
    "2025-12-31T18:15:00.000Z"
  );
});

test("startOfDay lands at 01:00 when local midnight is skipped by DST", () => {
  const start = startOfDay(new Date("2018-11-04T12:00:00Z"), "America/Sao_Paulo");
  assert.equal(start.toISOString(), "2018-11-04T03:00:00.000Z");
  assert.deepEqual(
    [partsAt(start, "America/Sao_Paulo").hour, partsAt(start, "America/Sao_Paulo").minute],
    [1, 0]
  );
  assert.equal(dayKey(start, "America/Sao_Paulo"), "2018-11-04");
});

test("startOfDay uses the current midnight in a fall-back fold", () => {
  // Havana repeats 00:00-00:59 on 2024-11-03. Before the fold the current
  // midnight is 04:00Z; after it, it is 05:00Z. Both are valid answers for
  // different instants in the same local day.
  const before = new Date("2024-11-03T04:30:00Z");
  const after = new Date("2024-11-03T05:30:00Z");
  assert.equal(dayKey(before, "America/Havana"), dayKey(after, "America/Havana"));
  assert.equal(startOfDay(before, "America/Havana").toISOString(), "2024-11-03T04:00:00.000Z");
  assert.equal(startOfDay(after, "America/Havana").toISOString(), "2024-11-03T05:00:00.000Z");
});

test("addDays crosses DST, month and year boundaries by calendar date", () => {
  const springForward = new Date("2024-03-10T12:00:00Z"); // 23-hour local day
  const next = addDays(springForward, "America/New_York", 1);
  assert.equal(next.toISOString(), "2024-03-11T04:00:00.000Z");
  assert.equal(dayKey(next, "America/New_York"), "2024-03-11");

  const fallBack = new Date("2024-11-03T12:00:00Z"); // 25-hour local day
  const after = addDays(fallBack, "America/New_York", 1);
  assert.equal(after.toISOString(), "2024-11-04T05:00:00.000Z");
  assert.equal(dayKey(after, "America/New_York"), "2024-11-04");

  const newYear = new Date("2026-12-31T23:00:00Z");
  assert.equal(dayKey(addDays(newYear, "Africa/Lagos", 1), "Africa/Lagos"), "2027-01-02");
  assert.equal(dayKey(addDays(newYear, "UTC", 1), "UTC"), "2027-01-01");
});

test("addDays is stable around a 30-minute DST shift and a skipped date", () => {
  const lordHowe = new Date("2024-10-06T12:00:00Z");
  const next = addDays(lordHowe, "Australia/Lord_Howe", 1);
  assert.equal(dayKey(next, "Australia/Lord_Howe"), "2024-10-07");
  assert.equal(partsAt(next, "Australia/Lord_Howe").hour, 0);

  // Apia skipped 2011-12-30 entirely when it crossed the date line.
  const afterSkip = new Date("2011-12-30T12:00:00Z"); // local 2011-12-31
  assert.equal(dayKey(addDays(afterSkip, "Pacific/Apia", 1), "Pacific/Apia"), "2012-01-01");
  assert.equal(dayKey(addDays(afterSkip, "Pacific/Apia", -1), "Pacific/Apia"), "2011-12-29");
});

test("dayNumber gives one step per calendar day, independent of DST", () => {
  assert.equal(dayNumber("2024-03-10") - dayNumber("2024-03-09"), 1);
  assert.equal(dayNumber("2024-11-03") - dayNumber("2024-11-02"), 1);
  assert.equal(dayNumber("2025-01-01") - dayNumber("2024-12-31"), 1);
});
