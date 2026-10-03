const mongoose = require("mongoose");
const ChallengeParticipant = require("../models/ChallengeParticipant");
const Challenge = require("../models/Challenge");
const Team = require("../models/Team");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const { individualBoard, teamStandings } = require("../services/leaderboardService");

const PERIODS = ["week", "all-time"];

function periodOf(req) {
  const period = req.query.period ?? "week";
  if (!PERIODS.includes(period)) throw ApiError.badRequest(`period must be one of: ${PERIODS.join(", ")}.`);
  return period;
}

async function findChallenge(id) {
  const challenge = mongoose.isValidObjectId(id) ? await Challenge.findById(id) : null;
  if (!challenge) throw ApiError.notFound("Challenge not found.");
  return challenge;
}

// GET /api/leaderboard?period=week|all-time
const getLeaderboard = async (req, res) => {
  res.json(await individualBoard(periodOf(req), req.user.id));
};

// GET /api/leaderboard/teams?period=week|all-time
const getTeamStandings = async (req, res) => {
  res.json(await teamStandings(periodOf(req), req.user.id));
};

// GET /api/leaderboard/challenge/:challengeId — every participant, ranked.
const getChallengeLeaderboard = async (req, res) => {
  const challenge = await findChallenge(req.params.challengeId);

  const participants = await ChallengeParticipant.find({ challenge: challenge._id })
    .populate("user", "firstName lastName profilePicture")
    .sort({ points: -1, progress: -1 });

  const leaderboard = participants.map((participant, index) => ({
    rank: index + 1,
    user: participant.user,
    progress: participant.progress,
    points: participant.points,
    completed: participant.completed,
  }));

  res.json({
    challenge: { id: challenge._id, title: challenge.title, goal: challenge.goal, unit: challenge.unit },
    count: leaderboard.length,
    leaderboard,
  });
};

// GET /api/leaderboard/challenge/:challengeId/teams — participating teams, ranked.
const getTeamLeaderboard = async (req, res) => {
  const challenge = await findChallenge(req.params.challengeId);

  const participants = await ChallengeParticipant.find({ challenge: challenge._id }).populate(
    "user",
    "firstName lastName teamId",
  );

  const teamScores = {};
  for (const participant of participants) {
    const user = participant.user;
    if (!user || !user.teamId) continue; // not on a team

    const teamId = user.teamId.toString();
    teamScores[teamId] ??= { teamId: user.teamId, points: 0, progress: 0, members: 0 };
    teamScores[teamId].points += participant.points;
    teamScores[teamId].progress += participant.progress;
    teamScores[teamId].members += 1;
  }

  const teams = await Team.find({ _id: { $in: Object.keys(teamScores) } }).select("name description");
  const teamMap = Object.fromEntries(teams.map((team) => [team._id.toString(), team]));

  const leaderboard = Object.values(teamScores)
    .filter((score) => teamMap[score.teamId.toString()]) // the team itself may have been deleted
    .map((score) => ({
      team: teamMap[score.teamId.toString()],
      points: score.points,
      progress: score.progress,
      members: score.members,
    }))
    .sort((a, b) => b.points - a.points || b.progress - a.progress)
    .map((team, index) => ({ rank: index + 1, ...team }));

  res.json({
    challenge: { id: challenge._id, title: challenge.title, goal: challenge.goal, unit: challenge.unit },
    count: leaderboard.length,
    leaderboard,
  });
};

// GET /api/leaderboard/challenge/:challengeId/team/:teamId — one team's members in a challenge, ranked.
const getTeamMemberLeaderboard = async (req, res) => {
  const challenge = await findChallenge(req.params.challengeId);
  const { teamId } = req.params;
  const team = mongoose.isValidObjectId(teamId) ? await Team.findById(teamId) : null;
  if (!team) throw ApiError.notFound("Team not found.");

  const members = await User.find({ teamId: team._id }).select("_id");

  const participants = await ChallengeParticipant.find({
    challenge: challenge._id,
    user: { $in: members.map((member) => member._id) },
  })
    .populate("user", "firstName lastName profilePicture")
    .sort({ points: -1, progress: -1 });

  const leaderboard = participants.map((participant, index) => ({
    rank: index + 1,
    user: participant.user,
    points: participant.points,
    progress: participant.progress,
    completed: participant.completed,
  }));

  res.json({
    team: { id: team._id, name: team.name },
    challenge: { id: challenge._id, title: challenge.title },
    count: leaderboard.length,
    leaderboard,
  });
};

module.exports = {
  getLeaderboard,
  getTeamStandings,
  getChallengeLeaderboard,
  getTeamLeaderboard,
  getTeamMemberLeaderboard,
};
