const mongoose = require("mongoose");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const matchup = require("../services/matchupService");

/** Deliberately 404, not 403: a stranger mustn't learn which team ids exist.
 *  Members of :id and active admins can read; admins inspect without joining. */
async function requireViewer(req, id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw ApiError.notFound("Team not found.");
  const requester = await User.findById(req.user.id).select("teamId role status").lean();
  const isAdmin = requester?.role === "admin" && requester.status === "active";
  const isMember = Boolean(requester?.teamId) && String(requester.teamId) === String(id);
  if (!requester || (!isAdmin && !isMember)) throw ApiError.notFound("Team not found.");
  return requester;
}

/** Reactions are a member's vote on their own matchup, so an admin who isn't
 *  on the team has no vote — even though they may read the card. */
async function requireMember(req, id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw ApiError.notFound("Team not found.");
  const requester = await User.findById(req.user.id).select("teamId").lean();
  if (!requester?.teamId || String(requester.teamId) !== String(id)) {
    throw ApiError.notFound("Team not found.");
  }
  return requester;
}

// GET /api/teams/:id/matchup
async function getMatchup(req, res) {
  await requireViewer(req, req.params.id);
  res.json(await matchup.getMatchup(req.params.id, req.user.id));
}

// GET /api/teams/:id/results?weeks=6 — newest completed week first, max 12.
async function getResults(req, res) {
  await requireViewer(req, req.params.id);
  const requested = Number.parseInt(req.query.weeks, 10);
  const weeks = Number.isFinite(requested) ? Math.min(12, Math.max(1, requested)) : 6;
  res.json(await matchup.getResults(req.params.id, weeks));
}

// PUT /api/teams/:id/matchup/reaction { emoji }
async function setReaction(req, res) {
  await requireMember(req, req.params.id);
  const { emoji } = req.body ?? {};
  if (!matchup.EMOJIS.includes(emoji)) {
    throw ApiError.badRequest("Choose fire, muscle, clap or grit.", { emoji: "Pick one of the four reactions." });
  }
  res.json(await matchup.setReaction(req.params.id, req.user.id, emoji));
}

// DELETE /api/teams/:id/matchup/reaction
async function clearReaction(req, res) {
  await requireMember(req, req.params.id);
  res.json(await matchup.clearReaction(req.params.id, req.user.id));
}

module.exports = { getMatchup, getResults, setReaction, clearReaction };
