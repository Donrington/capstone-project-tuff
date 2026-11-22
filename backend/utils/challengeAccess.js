const crypto = require("crypto");
const User = require("../models/User");
const ChallengeParticipant = require("../models/ChallengeParticipant");

const sameId = (a, b) => a != null && b != null && String(a) === String(b);

/** Invite codes are shared with dashes and mixed case; the stored code isn't. */
function normalizeInviteCode(raw) {
  return String(raw ?? "").replace(/[^a-z0-9]/gi, "").toUpperCase();
}

/** A wrong code must not be distinguishable by how long the comparison took. */
function inviteCodeMatches(provided, expected) {
  const candidate = normalizeInviteCode(provided);
  const wanted = normalizeInviteCode(expected);
  // timingSafeEqual throws on different lengths, and the length of a code is
  // not secret — reject that case first.
  if (!candidate || !wanted || candidate.length !== wanted.length) return false;
  return crypto.timingSafeEqual(Buffer.from(candidate, "utf8"), Buffer.from(wanted, "utf8"));
}

/**
 * req.user only carries the id/role from an access token that can be up to 15
 * minutes old. Team membership (and a fresh role) lives in the database, so
 * ask there rather than trusting a claim that may have since been revoked.
 */
function requesterFor(user) {
  if (!user?.id) return Promise.resolve(null);
  return User.findById(user.id).select("teamId role").lean();
}

/** One rule for every read of a challenge's details, roster or activity feed. */
async function canViewChallenge(challenge, user) {
  if (!challenge || !user?.id) return false;
  // The token's role is enough to short-circuit a stale team lookup for admins.
  if (user.role === "admin") return true;
  if (sameId(challenge.createdBy, user.id)) return true;

  const requester = await requesterFor(user);
  if (!requester) return false;
  if (requester.role === "admin") return true;
  if (sameId(challenge.teamId, requester.teamId)) return true;

  return Boolean(await ChallengeParticipant.exists({ challenge: challenge._id, user: user.id }));
}

/** Joining is narrower: owning it, matching its team, or holding its code. */
async function canJoinChallenge(challenge, user, providedInviteCode) {
  if (!challenge || !user?.id) return false;
  if (sameId(challenge.createdBy, user.id)) return true;
  if (inviteCodeMatches(providedInviteCode, challenge.inviteCode)) return true;

  const requester = await requesterFor(user);
  if (!requester) return false;
  return Boolean(challenge.teamId && sameId(challenge.teamId, requester.teamId));
}

module.exports = { canViewChallenge, canJoinChallenge, inviteCodeMatches, normalizeInviteCode };
