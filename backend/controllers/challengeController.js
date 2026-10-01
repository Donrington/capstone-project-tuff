const Challenge = require("../models/Challenge");
const ChallengeParticipant = require("../models/ChallengeParticipant");
const ApiError = require("../utils/ApiError");

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
  const { title, description, type, goal, unit, pointsPerUnit, startDate, endDate, maxParticipants, status, teamId, featured } =
    req.body;

  if (!title || !description || !type || goal === undefined || !unit || pointsPerUnit === undefined || !startDate || !endDate) {
    throw ApiError.badRequest("Please provide all required challenge fields.");
  }
  if (new Date(endDate) <= new Date(startDate)) {
    throw ApiError.badRequest("End date must be after start date.");
  }

  const challenge = await Challenge.create({
    title,
    description,
    type,
    goal,
    unit,
    pointsPerUnit,
    startDate,
    endDate,
    maxParticipants,
    status,
    teamId,
    inviteCode: generateInviteCode(),
    featured,
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

  const { title, description, type, goal, unit, pointsPerUnit, startDate, endDate, maxParticipants, status, teamId, featured } =
    req.body;

  if (title !== undefined) challenge.title = title;
  if (description !== undefined) challenge.description = description;
  if (type !== undefined) challenge.type = type;
  if (goal !== undefined) challenge.goal = goal;
  if (unit !== undefined) challenge.unit = unit;
  if (pointsPerUnit !== undefined) challenge.pointsPerUnit = pointsPerUnit;
  if (startDate !== undefined) challenge.startDate = startDate;
  if (endDate !== undefined) challenge.endDate = endDate;
  if (maxParticipants !== undefined) challenge.maxParticipants = maxParticipants;
  if (status !== undefined) challenge.status = status;
  if (teamId !== undefined) challenge.teamId = teamId;
  if (featured !== undefined) challenge.featured = featured;

  if (new Date(challenge.endDate) <= new Date(challenge.startDate)) {
    throw ApiError.badRequest("End date must be after start date.");
  }

  await challenge.save();
  res.json(challenge);
}

// GET /api/challenges/getbyCode/:code — public, used by the join-preview page before sign-in
async function getChallengeByInviteCode(req, res) {
  const { code } = req.params;
  const challenge = await Challenge.findOne({ inviteCode: code.toUpperCase() });
  if (!challenge) throw ApiError.notFound("Challenge not found.");
  res.json(challenge);
}

// GET /api/challenges/get/:id
async function getChallenge(req, res) {
  const challenge = await Challenge.findById(req.params.id);
  if (!challenge) throw ApiError.notFound("Challenge not found.");
  res.json(await withComputedProgress(challenge));
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

module.exports = { createChallenge, updateChallenge, getChallengeByInviteCode, getChallenge, deleteChallenge };
