const test = require("node:test");
const assert = require("node:assert/strict");
const Challenge = require("../models/Challenge");
const ChallengeParticipant = require("../models/ChallengeParticipant");
const Activity = require("../models/Activity");
const User = require("../models/User");
const { response, queryResult, withMocks } = require("../testHelpers");
const {
  joinChallenge,
  getChallengeParticipants,
  getChallengeActivities,
  getMyParticipation,
} = require("./challengeParticipantController");

const challenge = {
  _id: "challenge-1",
  createdBy: "creator-1",
  teamId: null,
  inviteCode: "PUSH9T3X",
  status: "active",
};

function notFound(err) {
  return err.status === 404 && err.message === "Challenge not found.";
}

test("joining by bare id is a 404 for someone who owns, shares and was invited to nothing", async () => {
  let created = false;
  await withMocks(
    {
      challenge: { object: Challenge, method: "findById", value: async () => challenge },
      requester: {
        object: User,
        method: "findById",
        value: () => ({ select: () => ({ lean: async () => ({ teamId: null, role: "member" }) }) }),
      },
      create: {
        object: ChallengeParticipant,
        method: "create",
        value: async () => {
          created = true;
          return {};
        },
      },
    },
    async () => {
      const res = response();
      await assert.rejects(
        () => joinChallenge({ params: { challengeId: "challenge-1" }, user: { id: "stranger", role: "member" }, body: {} }, res),
        notFound,
      );
      assert.equal(created, false);
    },
  );
});

test("joining with a normalised invite code succeeds", async () => {
  let createdFor;
  await withMocks(
    {
      challenge: { object: Challenge, method: "findById", value: async () => challenge },
      existing: { object: ChallengeParticipant, method: "findOne", value: () => queryResult(null) },
      count: { object: ChallengeParticipant, method: "countDocuments", value: async () => 0 },
      create: {
        object: ChallengeParticipant,
        method: "create",
        value: async (doc) => {
          createdFor = doc;
          return doc;
        },
      },
    },
    async () => {
      const res = response();
      await joinChallenge(
        {
          params: { challengeId: "challenge-1" },
          user: { id: "stranger", role: "member" },
          body: { inviteCode: "push-9t3x" },
        },
        res,
      );
      assert.equal(res.statusCode, 201);
      assert.deepEqual(createdFor, { user: "stranger", challenge: "challenge-1" });
    },
  );
});

test("the creator can still join their own suggested challenge without a code", async () => {
  await withMocks(
    {
      challenge: { object: Challenge, method: "findById", value: async () => challenge },
      existing: { object: ChallengeParticipant, method: "findOne", value: () => queryResult(null) },
      create: { object: ChallengeParticipant, method: "create", value: async (doc) => doc },
    },
    async () => {
      const res = response();
      await joinChallenge(
        { params: { challengeId: "challenge-1" }, user: { id: "creator-1", role: "member" }, body: {} },
        res,
      );
      assert.equal(res.statusCode, 201);
    },
  );
});

test("a teammate can join their team's challenge without a code", async () => {
  await withMocks(
    {
      challenge: { object: Challenge, method: "findById", value: async () => ({ ...challenge, teamId: "team-1" }) },
      requester: {
        object: User,
        method: "findById",
        value: () => ({ select: () => ({ lean: async () => ({ teamId: "team-1", role: "member" }) }) }),
      },
      existing: { object: ChallengeParticipant, method: "findOne", value: () => queryResult(null) },
      create: { object: ChallengeParticipant, method: "create", value: async (doc) => doc },
    },
    async () => {
      const res = response();
      await joinChallenge(
        { params: { challengeId: "challenge-1" }, user: { id: "u1", role: "member" }, body: {} },
        res,
      );
      assert.equal(res.statusCode, 201);
    },
  );
});

const readCases = [
  ["getChallengeParticipants", getChallengeParticipants, { object: ChallengeParticipant, method: "find", value: () => queryResult([]) }],
  ["getChallengeActivities", getChallengeActivities, { object: ChallengeParticipant, method: "find", value: () => queryResult([]) }],
  ["getMyParticipation", getMyParticipation, { object: ChallengeParticipant, method: "findOne", value: () => queryResult(null) }],
];

for (const [name, handler, participantMock] of readCases) {
  test(`${name} hides another user's challenge behind a 404`, async () => {
    await withMocks(
      {
        challenge: { object: Challenge, method: "findById", value: async () => challenge },
        requester: {
          object: User,
          method: "findById",
          value: () => ({ select: () => ({ lean: async () => ({ teamId: null, role: "member" }) }) }),
        },
        exists: { object: ChallengeParticipant, method: "exists", value: async () => false },
        participants: participantMock,
      },
      async () => {
        const res = response();
        await assert.rejects(
          () => handler({ params: { challengeId: "challenge-1" }, user: { id: "stranger", role: "member" }, query: {} }, res),
          notFound,
        );
        assert.equal(res.statusCode, null);
      },
    );
  });
}

test("the three read handlers still serve a legitimate participant", async () => {
  const participant = { _id: "p1", progress: 4 };
  await withMocks(
    {
      challenge: { object: Challenge, method: "findById", value: async () => challenge },
      requester: {
        object: User,
        method: "findById",
        value: () => ({ select: () => ({ lean: async () => ({ teamId: null, role: "member" }) }) }),
      },
      exists: { object: ChallengeParticipant, method: "exists", value: async () => true },
      find: { object: ChallengeParticipant, method: "find", value: () => queryResult([participant]) },
      findOne: { object: ChallengeParticipant, method: "findOne", value: () => queryResult(participant) },
      activities: { object: Activity, method: "find", value: () => queryResult([]) },
    },
    async () => {
      const req = { params: { challengeId: "challenge-1" }, user: { id: "u1", role: "member" }, query: {} };
      for (const handler of [getChallengeParticipants, getMyParticipation]) {
        const res = response();
        await handler(req, res);
        assert.deepEqual(res.body, handler === getMyParticipation ? participant : [participant]);
      }
      const res = response();
      await getChallengeActivities(req, res);
      assert.deepEqual(res.body, []);
    },
  );
});

test("an admin can read challenge details and feeds", async () => {
  await withMocks(
    {
      challenge: { object: Challenge, method: "findById", value: async () => challenge },
      find: { object: ChallengeParticipant, method: "find", value: () => queryResult([]) },
      activities: { object: Activity, method: "find", value: () => queryResult([]) },
    },
    async () => {
      const res = response();
      await getChallengeActivities(
        { params: { challengeId: "challenge-1" }, user: { id: "admin-1", role: "admin" }, query: {} },
        res,
      );
      assert.equal(res.statusCode, null);
      assert.deepEqual(res.body, []);
    },
  );
});
