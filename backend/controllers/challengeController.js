const mongoose = require("mongoose");
const Challenge = require("../models/Challenge");
const ChallengeParticipant = require("../models/ChallengeParticipant");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const { canViewChallenge } = require("../utils/challengeAccess");
const { challengeCreateFields, challengeUpdateFields } = require("../utils/challengeInput");

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 12).toUpperCase();
}

/** `current` (the shared running total), `dayIndex` and `totalDays` are
 *  computed here, never stored — see the WhatsApp thread this matches:
 *  current is the sum of every participant's progress, not whoever's
 *  closest to goal; dayIndex/totalDays come from startDate/endDate so they
 *  can't go stale. */
async function withComputedProgress(challenge) {
  const participants = await ChallengeParticipant.find({ challenge: challenge._id });
  const current = participants.reduce((total, p) => total + p.progress, 0);

  const totalDays = Math.max(1, Math.ceil((new Date(challenge.endDate) - new Date(challenge.startDate)) / MS_PER_DAY));
  const dayIndex = Math.min(
    Math.max(Math.floor((Date.now() - new Date(challenge.startDate)) / MS_PER_DAY) + 1, 0),
    totalDays,
  );

  return { ...challenge.toObject(), current, dayIndex, totalDays };
}

// POST /api/challenges/create
async function createChallenge(req, res) {
  // The creator's team comes from the database, never from the request.
  const creator = await User.findById(req.user.id).select("teamId role");
  if (!creator) throw ApiError.unauthorized();
  const fields = challengeCreateFields(req.body, {
    teamId: creator.teamId ? String(creator.teamId) : null,
    isAdmin: creator.role === "admin",
  });

  const challenge = await Challenge.create({
    ...fields,
    inviteCode: generateInviteCode(),
    createdBy: req.user.id,
  });

  res.status(201).json(challenge);
}

// PATCH /api/challenges/update/:id
async function updateChallenge(req, res) {
  const { id } = req.params;
  const challenge = await Challenge.findById(id);
  if (!challenge) throw ApiError.notFound("Challenge not found.");

  // Only the creator can update it — the same rule deleteChallenge enforces.
  if (challenge.createdBy.toString() !== req.user.id) {
    throw ApiError.forbidden("You cannot update a challenge you didn't create.");
  }

  Object.assign(challenge, challengeUpdateFields(req.body, challenge, { isAdmin: req.user.role === "admin" }));
  await challenge.save();
  res.json(challenge);
}

// GET /api/challenges/getbyCode/:code — authenticated; the full challenge record
async function getChallengeByInviteCode(req, res) {
  const { code } = req.params;
  const challenge = await Challenge.findOne({ inviteCode: code.toUpperCase() });
  if (!challenge) throw ApiError.notFound("Challenge not found.");
  res.json(challenge);
}

// GET /api/challenges/get/:id
async function getChallenge(req, res) {
  const challenge = await Challenge.findById(req.params.id);
  if (!(await canViewChallenge(challenge, req.user))) throw ApiError.notFound("Challenge not found.");
  res.json(await withComputedProgress(challenge));
}

// GET /api/challenges — the challenges you've joined, plus every challenge
// your team runs (a team challenge is everyone's on the team, joined or not),
// with live progress. Featured first, then newest start date.
async function listMyChallenges(req, res) {
  const [mine, me] = await Promise.all([
    ChallengeParticipant.find({ user: req.user.id }).select("challenge"),
    User.findById(req.user.id).select("teamId"),
  ]);
  const yours = [{ _id: mongoose.trusted({ $in: mine.map((p) => p.challenge) }) }];
  if (me?.teamId) yours.push({ teamId: me.teamId });
  const challenges = await Challenge.find({ $or: yours, status: mongoose.trusted({ $ne: "cancelled" }) }).sort({
    featured: -1,
    startDate: -1,
  });
  res.json(await Promise.all(challenges.map(withComputedProgress)));
}

// DELETE /api/challenges/delete/:id
async function deleteChallenge(req, res) {
  const { id } = req.params;
  const challenge = await Challenge.findById(id);
  if (!challenge) throw ApiError.notFound("Challenge not found.");

  if (challenge.createdBy.toString() !== req.user.id) {
    throw ApiError.forbidden("You cannot delete a challenge you didn't create.");
  }

  await Challenge.findByIdAndDelete(challenge._id);
  res.status(204).end();
}

module.exports = {
  createChallenge,
  updateChallenge,
  getChallengeByInviteCode,
  getChallenge,
  deleteChallenge,
  listMyChallenges,
};
