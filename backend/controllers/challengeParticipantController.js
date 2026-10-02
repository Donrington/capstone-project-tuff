const ChallengeParticipant = require("../models/ChallengeParticipant");
const Challenge = require("../models/Challenge");
const Activity = require("../models/Activity");
const ApiError = require("../utils/ApiError");
const { notify, bestEffort } = require("../services/notificationService");
const { evaluateAchievements } = require("../services/achievementService");

function notifyChallengeFinished(userId, challenge) {
  return bestEffort("notify challenge finished", () =>
    notify(userId, {
      type: "challenge",
      title: `You finished ${challenge.title}`,
      message: `You hit the goal of ${challenge.goal} ${challenge.unit}. Nice work.`,
    }),
  );
}

// POST /api/challenge-participants/:challengeId/join
async function joinChallenge(req, res) {
  const { challengeId } = req.params;
  const userId = req.user.id;

  const challenge = await Challenge.findById(challengeId);
  if (!challenge) throw ApiError.notFound("Challenge not found.");
  if (challenge.status === "completed" || challenge.status === "cancelled") {
    throw ApiError.badRequest("You cannot join this challenge.");
  }

  const existing = await ChallengeParticipant.findOne({ user: userId, challenge: challengeId });
  if (existing) throw ApiError.badRequest("You have already joined this challenge.");

  if (challenge.maxParticipants) {
    const count = await ChallengeParticipant.countDocuments({ challenge: challengeId });
    if (count >= challenge.maxParticipants) throw ApiError.badRequest("This challenge is already at full capacity.");
  }

  const participant = await ChallengeParticipant.create({ user: userId, challenge: challengeId });
  res.status(201).json(participant);
}

// GET /api/challenge-participants/:challengeId/me
async function getMyParticipation(req, res) {
  const { challengeId } = req.params;
  const participant = await ChallengeParticipant.findOne({ user: req.user.id, challenge: challengeId })
    .populate("user", "firstName lastName email")
    .populate("challenge", "title type goal unit startDate endDate");
  if (!participant) throw ApiError.notFound("You are not a participant in this challenge.");
  res.json(participant);
}

// GET /api/challenge-participants/:challengeId
async function getChallengeParticipants(req, res) {
  const { challengeId } = req.params;
  const challenge = await Challenge.findById(challengeId);
  if (!challenge) throw ApiError.notFound("Challenge not found.");

  const participants = await ChallengeParticipant.find({ challenge: challengeId })
    .populate("user", "firstName lastName profilePicture")
    .sort({ points: -1, progress: -1 });
  res.json(participants);
}

/** Activity.type/.unit aren't quite the same enums as Challenge.type/.unit
 *  (Activity has no "calories"/"weight-loss"/"custom"; Challenge has no
 *  "swimming"/"hiking"/"other"). Falls back to "other" for type — a safe
 *  catch-all Activity already supports — but refuses to guess at a unit
 *  mismatch, since silently relabeling km as something else would corrupt
 *  the number. Worth reconciling the two enums directly at some point. */
const ACTIVITY_TYPES = new Set(["running", "walking", "cycling", "swimming", "workout", "steps", "hiking", "other"]);
const ACTIVITY_UNITS = new Set(["km", "miles", "steps", "minutes", "seconds", "reps"]);

// POST /api/challenge-participants/:challengeId/activities — the real,
// server-computed way progress increases. Replaces trusting a client-sent
// progress number: this creates an Activity record and increments from it.
async function logActivity(req, res) {
  const { challengeId } = req.params;
  const userId = req.user.id;
  const { value, recordedAt } = req.body;

  if (typeof value !== "number" || !(value > 0)) {
    throw ApiError.badRequest("value must be a number greater than 0.");
  }

  const challenge = await Challenge.findById(challengeId);
  if (!challenge) throw ApiError.notFound("Challenge not found.");
  if (!ACTIVITY_UNITS.has(challenge.unit)) {
    throw ApiError.badRequest(`Logging isn't supported yet for challenges measured in "${challenge.unit}".`);
  }

  const participant = await ChallengeParticipant.findOne({ user: userId, challenge: challengeId });
  if (!participant) throw ApiError.badRequest("Join this challenge before logging activity against it.");
  if (participant.completed) throw ApiError.badRequest("You've already completed this challenge.");

  const activity = await Activity.create({
    user: userId,
    challenge: challengeId,
    type: ACTIVITY_TYPES.has(challenge.type) ? challenge.type : "other",
    value,
    unit: challenge.unit,
    recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
  });

  const previousProgress = participant.progress;
  const pointsEarned = value * challenge.pointsPerUnit;
  let updated = await ChallengeParticipant.findByIdAndUpdate(
    participant._id,
    { $inc: { progress: value, points: pointsEarned } },
    { new: true },
  );

  const justCompleted = previousProgress < challenge.goal && updated.progress >= challenge.goal;
  if (justCompleted) {
    updated = await ChallengeParticipant.findByIdAndUpdate(
      participant._id,
      { completed: true, completedAt: new Date() },
      { new: true },
    );
    await notifyChallengeFinished(userId, challenge);
  }

  // Returned so the frontend can celebrate right away, not just via the bell.
  const newAchievements = (await bestEffort("evaluate achievements", () => evaluateAchievements(userId))) ?? [];

  res.status(201).json({ activity, participant: updated, justCompleted, newAchievements });
}

// PATCH /api/challenge-participants/:challengeId/progress — admin-only
// correction tool. Regular play goes through logActivity above; this isn't
// gated by progress earned because it's for fixing mistakes, not earning
// points — see requireRole("admin") on this route.
async function updateProgress(req, res) {
  const { challengeId } = req.params;
  const { userId, progress } = req.body;
  if (!userId) throw ApiError.badRequest("userId is required.");
  if (typeof progress !== "number" || progress < 0) {
    throw ApiError.badRequest("progress must be a number greater than or equal to 0.");
  }

  const participant = await ChallengeParticipant.findOneAndUpdate(
    { user: userId, challenge: challengeId },
    { progress },
    { new: true },
  );
  if (!participant) throw ApiError.notFound("That user isn't a participant in this challenge.");
  res.json(participant);
}

// PATCH /api/challenge-participants/:challengeId/complete — only valid once
// the goal is actually met; logActivity sets this automatically, this is
// for a participant to confirm it if for some reason it didn't.
async function completeChallenge(req, res) {
  const { challengeId } = req.params;
  const userId = req.user.id;

  const [participant, challenge] = await Promise.all([
    ChallengeParticipant.findOne({ user: userId, challenge: challengeId }),
    Challenge.findById(challengeId),
  ]);
  if (!participant) throw ApiError.notFound("You are not a participant in this challenge.");
  if (participant.completed) throw ApiError.badRequest("You have already completed this challenge.");
  if (!challenge || participant.progress < challenge.goal) {
    throw ApiError.badRequest("You haven't reached the goal yet.");
  }

  participant.completed = true;
  participant.completedAt = new Date();
  await participant.save();
  await notifyChallengeFinished(userId, challenge);
  await bestEffort("evaluate achievements", () => evaluateAchievements(userId));
  res.json(participant);
}

// DELETE /api/challenge-participants/:challengeId/leave
async function leaveChallenge(req, res) {
  const { challengeId } = req.params;
  const participant = await ChallengeParticipant.findOne({ user: req.user.id, challenge: challengeId });
  if (!participant) throw ApiError.notFound("You are not a participant in this challenge.");

  await ChallengeParticipant.findByIdAndDelete(participant._id);
  res.status(204).end();
}

module.exports = {
  joinChallenge,
  getMyParticipation,
  getChallengeParticipants,
  logActivity,
  updateProgress,
  completeChallenge,
  leaveChallenge,
};
