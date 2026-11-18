const test = require("node:test");
const assert = require("node:assert/strict");
const Team = require("../models/Team");
const Challenge = require("../models/Challenge");
const User = require("../models/User");
const { getInvitePreview } = require("./inviteController");

function response() {
  return {
    statusCode: null,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function leanResult(value) {
  return {
    select() {
      return this;
    },
    async lean() {
      return value;
    },
  };
}

async function withMocks(mocks, run) {
  const saved = Object.entries(mocks).map(([key, entry]) => {
    const original = entry.object[entry.method];
    entry.object[entry.method] = entry.value;
    return { ...entry, original };
  });
  try {
    await run();
  } finally {
    for (const entry of saved) entry.object[entry.method] = entry.original;
  }
}

test("malformed codes get the same 404 body as unknown codes", async () => {
  const originals = { team: Team.findOne, challenge: Challenge.findOne };
  Team.findOne = () => {
    throw new Error("malformed code must not reach the database");
  };
  Challenge.findOne = () => {
    throw new Error("malformed code must not reach the database");
  };

  try {
    for (const code of ["", "!!!", "x".repeat(33)]) {
      const res = response();
      await getInvitePreview({ params: { code } }, res);
      assert.equal(res.statusCode, 404);
      assert.deepEqual(res.body, { message: "No invite with that code." });
    }
  } finally {
    Team.findOne = originals.team;
    Challenge.findOne = originals.challenge;
  }
});

test("unknown codes get the flat 404 message", async () => {
  await withMocks(
    {
      team: { object: Team, method: "findOne", value: () => leanResult(null) },
      challenge: { object: Challenge, method: "findOne", value: () => leanResult(null) },
    },
    async () => {
      const res = response();
      await getInvitePreview({ params: { code: "NOPE123" } }, res);
      assert.equal(res.statusCode, 404);
      assert.deepEqual(res.body, { message: "No invite with that code." });
    },
  );
});

test("team previews contain only the public fields", async () => {
  let teamQuery;
  let countQuery;

  await withMocks(
    {
      team: {
        object: Team,
        method: "findOne",
        value: (query) => {
          teamQuery = query;
          return leanResult({ _id: "team-1", name: "Ironclad", createdBy: "user-1" });
        },
      },
      challenge: { object: Challenge, method: "findOne", value: () => leanResult(null) },
      byId: { object: User, method: "findById", value: () => leanResult({ firstName: "Ada" }) },
      count: {
        object: User,
        method: "countDocuments",
        value: async (query) => {
          countQuery = query;
          return 7;
        },
      },
    },
    async () => {
      const res = response();
      // Dashes and case are normalized before the lookup.
      await getInvitePreview({ params: { code: "abc-123" } }, res);
      assert.deepEqual(teamQuery, { inviteCode: "ABC123", status: "active" });
      assert.deepEqual(countQuery, { teamId: "team-1" });
      assert.equal(res.statusCode, null);
      assert.deepEqual(res.body, {
        kind: "team",
        name: "Ironclad",
        memberCount: 7,
        inviterFirstName: "Ada",
      });
    },
  );
});

test("challenge previews contain only the public fields", async () => {
  let challengeQuery;

  await withMocks(
    {
      team: { object: Team, method: "findOne", value: () => leanResult(null) },
      challenge: {
        object: Challenge,
        method: "findOne",
        value: (query) => {
          challengeQuery = query;
          return leanResult({
            title: "Push-Up Power Week",
            goal: 210,
            unit: "reps",
            endDate: new Date("2026-12-01T00:00:00.000Z"),
            createdBy: "user-2",
          });
        },
      },
      byId: { object: User, method: "findById", value: () => leanResult({ firstName: "Tunde" }) },
    },
    async () => {
      const res = response();
      await getInvitePreview({ params: { code: "push9" } }, res);
      // Cancelled challenges can't be joined, so they never get a preview.
      assert.deepEqual(challengeQuery, { inviteCode: "PUSH9", status: { $ne: "cancelled" } });
      assert.equal(res.statusCode, null);
      assert.deepEqual(res.body, {
        kind: "challenge",
        title: "Push-Up Power Week",
        goal: 210,
        unit: "reps",
        endDate: new Date("2026-12-01T00:00:00.000Z"),
        inviterFirstName: "Tunde",
      });
    },
  );
});
