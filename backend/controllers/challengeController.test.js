const test = require("node:test");
const assert = require("node:assert/strict");
const Challenge = require("../models/Challenge");
const ChallengeParticipant = require("../models/ChallengeParticipant");
const User = require("../models/User");
const { response, withMocks } = require("../testHelpers");
const { getChallenge } = require("./challengeController");

const stored = {
  _id: "challenge-1",
  createdBy: "creator-1",
  teamId: null,
  title: "Push-Up Power Week",
  goal: 100,
  unit: "reps",
  startDate: new Date("2026-11-01T00:00:00Z"),
  endDate: new Date("2026-11-15T00:00:00Z"),
  toObject() {
    return { ...this, toObject: undefined };
  },
};

function req(user) {
  return { params: { id: "challenge-1" }, user };
}

test("GET /challenges/get/:id hides the challenge from an outsider", async () => {
  await withMocks(
    {
      challenge: { object: Challenge, method: "findById", value: async () => stored },
      requester: {
        object: User,
        method: "findById",
        value: () => ({ select: () => ({ lean: async () => ({ teamId: null, role: "member" }) }) }),
      },
      exists: { object: ChallengeParticipant, method: "exists", value: async () => false },
    },
    async () => {
      const res = response();
      await assert.rejects(
        () => getChallenge(req({ id: "stranger", role: "member" }), res),
        (err) => err.status === 404 && err.message === "Challenge not found.",
      );
      assert.equal(res.statusCode, null);
    },
  );
});

test("GET /challenges/get/:id still returns progress to a creator and an admin", async () => {
  for (const user of [
    { id: "creator-1", role: "member" },
    { id: "admin-1", role: "admin" },
  ]) {
    await withMocks(
      {
        challenge: { object: Challenge, method: "findById", value: async () => stored },
        participants: { object: ChallengeParticipant, method: "find", value: async () => [{ progress: 7 }] },
      },
      async () => {
        const res = response();
        await getChallenge(req(user), res);
        assert.equal(res.body.current, 7);
        assert.equal(res.body.title, stored.title);
      },
    );
  }
});
