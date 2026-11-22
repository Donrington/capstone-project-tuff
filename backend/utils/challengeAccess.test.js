const test = require("node:test");
const assert = require("node:assert/strict");
const User = require("../models/User");
const ChallengeParticipant = require("../models/ChallengeParticipant");
const { withMocks } = require("../testHelpers");
const {
  canViewChallenge,
  canJoinChallenge,
  inviteCodeMatches,
  normalizeInviteCode,
} = require("./challengeAccess");

const challenge = {
  _id: "challenge-1",
  createdBy: "creator-1",
  teamId: null,
  inviteCode: "PUSH9T3X",
};

test("invite codes are normalised the same way everywhere", () => {
  assert.equal(normalizeInviteCode("push-9 t3x!"), "PUSH9T3X");
  assert.equal(inviteCodeMatches("push-9t3x", challenge.inviteCode), true);
  assert.equal(inviteCodeMatches("WRONGCODE", challenge.inviteCode), false);
  // Different lengths never reach timingSafeEqual (it would throw).
  assert.equal(inviteCodeMatches("PUSH9", challenge.inviteCode), false);
});

test("creator and admin see any challenge without a participant lookup", async () => {
  let lookups = 0;
  await withMocks(
    {
      requester: {
        object: User,
        method: "findById",
        value: () => {
          lookups += 1;
          throw new Error("must not query for creator/admin");
        },
      },
      participant: {
        object: ChallengeParticipant,
        method: "exists",
        value: () => {
          throw new Error("must not query for creator/admin");
        },
      },
    },
    async () => {
      assert.equal(await canViewChallenge(challenge, { id: "creator-1", role: "member" }), true);
      assert.equal(await canViewChallenge(challenge, { id: "stranger", role: "admin" }), true);
      assert.equal(lookups, 0);
    },
  );
});

test("a teammate, participant or admin from the database can view; a stranger can't", async () => {
  for (const [requester, participant, expected] of [
    [{ teamId: "team-1", role: "member" }, false, true],
    [{ teamId: null, role: "member" }, true, true],
    [{ teamId: null, role: "admin" }, false, true],
    [{ teamId: "other-team", role: "member" }, false, false],
  ]) {
    await withMocks(
      {
        requester: { object: User, method: "findById", value: () => ({ select: () => ({ lean: async () => requester }) }) },
        participant: { object: ChallengeParticipant, method: "exists", value: async () => participant },
      },
      async () => {
        assert.equal(await canViewChallenge({ ...challenge, teamId: "team-1" }, { id: "u1", role: "member" }), expected);
      },
    );
  }
  assert.equal(await canViewChallenge(null, { id: "u1", role: "member" }), false);
});

test("the owner, the team and a valid invite code can join; everybody else gets no", async () => {
  assert.equal(await canJoinChallenge(challenge, { id: "creator-1", role: "member" }, undefined), true);
  assert.equal(await canJoinChallenge(challenge, { id: "stranger", role: "member" }, "push-9t3x"), true);

  await withMocks(
    {
      requester: {
        object: User,
        method: "findById",
        value: (id) => ({
          select: () => ({
            lean: async () => ({ teamId: id === "u1" ? "team-1" : "other-team", role: "member" }),
          }),
        }),
      },
    },
    async () => {
      assert.equal(
        await canJoinChallenge({ ...challenge, teamId: "team-1" }, { id: "u1", role: "member" }, undefined),
        true,
      );
      assert.equal(await canJoinChallenge({ ...challenge, teamId: "team-1" }, { id: "u2", role: "member" }, "BAD"), false);
    },
  );
});
