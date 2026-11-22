const test = require("node:test");
const assert = require("node:assert/strict");
const User = require("../models/User");
const MatchupReaction = require("../models/MatchupReaction");
const leaderboard = require("../services/leaderboardService");
const matchupService = require("../services/matchupService");
const matchupController = require("./matchupController");
const { response, queryResult, withMocks } = require("../testHelpers");

const TEAM_ID = "507f1f77bcf86cd799439011";
const RIVAL_ID = "507f1f77bcf86cd799439012";
const USER_ID = "507f1f77bcf86cd799439013";
const WEEK_START = Date.parse("2026-11-16T00:00:00.000Z");

const matchup = {
  team: { id: TEAM_ID, name: "Team Ironclad", points: 120 },
  rival: { id: RIVAL_ID, name: "Team Voltage", points: 95 },
  weekStart: new Date(WEEK_START).toISOString(),
  reactions: { counts: { fire: 1, muscle: 0, clap: 0, grit: 0 }, mine: "fire" },
};

function requester(overrides = {}) {
  return queryResult({ teamId: null, role: "member", status: "active", ...overrides });
}

function req(user, params = { id: TEAM_ID }, query = {}, body = {}) {
  return { user, params, query, body };
}

test("matchup hides team data from outsiders and serves members and admins", async () => {
  const member = { id: USER_ID, role: "member" };
  const admin = { id: "507f1f77bcf86cd799439019", role: "admin" };
  const cases = [
    { user: { id: "507f1f77bcf86cd799439018", role: "member" }, lean: requester({ teamId: RIVAL_ID }), allowed: false },
    { user: member, lean: requester({ teamId: TEAM_ID }), allowed: true },
    { user: admin, lean: requester({ role: "admin" }), allowed: true },
  ];

  for (const scenario of cases) {
    await withMocks(
      {
        viewer: { object: User, method: "findById", value: () => scenario.lean },
        card: { object: matchupService, method: "getMatchup", value: async () => matchup },
      },
      async () => {
        const res = response();
        if (!scenario.allowed) {
          await assert.rejects(
            () => matchupController.getMatchup(req(scenario.user), res),
            (err) => err.status === 404 && /not found/i.test(err.message),
          );
          assert.equal(res.body, undefined);
        } else {
          await matchupController.getMatchup(req(scenario.user), res);
          assert.equal(res.body, matchup);
        }
      },
    );
  }
});

test("results report wins, losses and draws and skip weeks without a rival", async () => {
  const rows = (rivalId, mine, theirs) => [
    { id: TEAM_ID, name: "Team Ironclad", points: mine, rivalId },
    ...(rivalId
      ? [{ id: RIVAL_ID, name: "Team Voltage", points: theirs, rivalId: TEAM_ID }]
      : []),
  ];
  let call = 0;

  await withMocks(
    {
      bounds: { object: leaderboard, method: "weekBounds", value: () => ({ start: WEEK_START, end: WEEK_START + 7 * 86400000 }) },
      points: { object: leaderboard, method: "pointsByUser", value: async () => new Map() },
      ranks: {
        object: leaderboard,
        method: "teamRanksForWindow",
        value: async () => {
          call += 1;
          if (call === 1) return rows(RIVAL_ID, 110, 90);
          if (call === 2) return rows(RIVAL_ID, 80, 100);
          if (call === 3) return rows(RIVAL_ID, 95, 95);
          return rows(null, 70, 0);
        },
      },
    },
    async () => {
      const results = await matchupService.getResults(TEAM_ID, 4, WEEK_START + 1000);
      assert.deepEqual(
        results.map((row) => row.outcome),
        ["won", "lost", "drew"],
      );
      assert.equal(results.length, 3);
      assert.deepEqual(
        results.map((row) => row.weekOf),
        [
          new Date(WEEK_START - 7 * 86400000).toISOString(),
          new Date(WEEK_START - 14 * 86400000).toISOString(),
          new Date(WEEK_START - 21 * 86400000).toISOString(),
        ],
      );
    },
  );
});

test("reaction endpoint answers 400 for an emoji outside the four", async () => {
  await withMocks(
    {
      member: { object: User, method: "findById", value: () => requester({ teamId: TEAM_ID }) },
    },
    async () => {
      await assert.rejects(
        () => matchupController.setReaction(req({ id: USER_ID, role: "member" }, { id: TEAM_ID }, {}, { emoji: "🎉" }), response()),
        (err) => err.status === 400 && /fire, muscle, clap or grit/i.test(err.message),
      );
    },
  );
});

test("a reaction upserts once per team, week and user, and can be cleared", async () => {
  const calls = [];
  const state = { counts: { fire: 1, muscle: 0, clap: 0, grit: 0 }, mine: "fire" };

  await withMocks(
    {
      bounds: { object: leaderboard, method: "weekBounds", value: () => ({ start: WEEK_START, end: WEEK_START + 7 * 86400000 }) },
      upsert: {
        object: MatchupReaction,
        method: "findOneAndUpdate",
        value: async (filter, update, options) => {
          calls.push({ kind: "upsert", filter, update, options });
          return {};
        },
      },
      remove: {
        object: MatchupReaction,
        method: "deleteOne",
        value: async (filter) => {
          calls.push({ kind: "delete", filter });
          return { deletedCount: 1 };
        },
      },
      votes: { object: MatchupReaction, method: "find", value: () => queryResult([{ emoji: "fire", user: USER_ID }]) },
    },
    async () => {
      const result = await matchupService.setReaction(TEAM_ID, USER_ID, "fire");
      assert.deepEqual(result, state);
      const upsert = calls.find((entry) => entry.kind === "upsert");
      assert.equal(String(upsert.filter.team), TEAM_ID);
      assert.equal(upsert.filter.weekStart.getTime(), WEEK_START);
      assert.equal(String(upsert.filter.user), USER_ID);
      assert.deepEqual(upsert.update, { $set: { emoji: "fire" } });
      assert.equal(upsert.options.upsert, true);

      await matchupService.clearReaction(TEAM_ID, USER_ID);
      const remove = calls.find((entry) => entry.kind === "delete");
      assert.equal(String(remove.filter.team), TEAM_ID);
      assert.equal(remove.filter.weekStart.getTime(), WEEK_START);
      assert.equal(String(remove.filter.user), USER_ID);
    },
  );
});

test("an admin who is not on the team cannot vote, matching the read-only role", async () => {
  await withMocks(
    {
      member: { object: User, method: "findById", value: () => requester({ role: "admin" }) },
    },
    async () => {
      await assert.rejects(
        () => matchupController.setReaction(req({ id: "507f1f77bcf86cd799439019", role: "admin" }, { id: TEAM_ID }, {}, { emoji: "fire" }), response()),
        (err) => err.status === 404,
      );
    },
  );
});
