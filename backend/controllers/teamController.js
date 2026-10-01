const Team = require("../models/Team");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const { notify, notifyMany, bestEffort } = require("../services/notificationService");
const { evaluateAchievements } = require("../services/achievementService");

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 12).toUpperCase();
}

// POST /api/teams
async function createTeam(req, res) {
  const { name, description, maxMembers } = req.body;
  const userId = req.user.id;

  if (!name) throw ApiError.badRequest("Team name is required.");

  const team = await Team.create({
    name,
    description,
    inviteCode: generateInviteCode(),
    maxMembers,
    createdBy: userId,
  });

  // The creator is a member of their own team.
  await User.findByIdAndUpdate(userId, { teamId: team._id });
  await bestEffort("evaluate achievements", () => evaluateAchievements(userId));

  res.status(201).json(team);
}

// GET /api/teams/:id
async function getTeamById(req, res) {
  const team = await Team.findById(req.params.id).populate("createdBy", "firstName lastName email");
  if (!team) throw ApiError.notFound("Team not found.");
  res.json(team);
}

// GET /api/teams
async function getAllTeams(req, res) {
  const teams = await Team.find({ status: "active" }).populate("createdBy", "firstName lastName").sort({ createdAt: -1 });
  res.json(teams);
}

// PATCH /api/teams/:id
async function updateTeam(req, res) {
  const { id } = req.params;
  const team = await Team.findById(id);
  if (!team) throw ApiError.notFound("Team not found.");

  if (team.createdBy.toString() !== req.user.id) {
    throw ApiError.forbidden("You are not authorized to update this team.");
  }

  const { name, description, maxMembers, status } = req.body;
  if (name !== undefined) team.name = name;
  if (description !== undefined) team.description = description;
  if (maxMembers !== undefined) team.maxMembers = maxMembers;
  if (status !== undefined) team.status = status;
  // inviteCode isn't editable here on purpose — changing it would silently
  // break any invite links already shared.

  await team.save();
  res.json(team);
}

// POST /api/teams/join — body: { inviteCode }
async function joinTeam(req, res) {
  const { inviteCode } = req.body;
  const userId = req.user.id;
  if (!inviteCode) throw ApiError.badRequest("Invite code is required.");

  const team = await Team.findOne({ inviteCode: inviteCode.toUpperCase(), status: "active" });
  if (!team) throw ApiError.notFound("Team not found or inactive.");

  const user = await User.findById(userId);
  if (user.teamId) throw ApiError.badRequest("You are already a member of a team.");

  const memberCount = await User.countDocuments({ teamId: team._id });
  if (team.maxMembers && memberCount >= team.maxMembers) {
    throw ApiError.badRequest("This team is already full.");
  }

  user.teamId = team._id;
  await user.save();

  await bestEffort("notify team join", async () => {
    await notify(userId, {
      type: "system",
      title: `Welcome to ${team.name}`,
      message: "You're on the team. Log activity to climb the team leaderboard together.",
    });
    const teammates = await User.find({ teamId: team._id, _id: { $ne: user._id } }).select("_id");
    await notifyMany(
      teammates.map((t) => t._id),
      {
        type: "general",
        title: `${user.firstName} joined ${team.name}`,
        message: `Say hi to ${user.firstName} ${user.lastName}, your newest teammate.`,
        pref: "teamActivity",
      },
    );
  });
  await bestEffort("evaluate achievements", () => evaluateAchievements(userId));

  res.json(team);
}

// DELETE /api/teams/leave
async function leaveTeam(req, res) {
  const user = await User.findById(req.user.id);
  if (!user.teamId) throw ApiError.badRequest("You are not a member of a team.");

  user.teamId = null;
  await user.save();
  res.status(204).end();
}

// GET /api/teams/:id/members — members only; team rosters (with emails)
// aren't public to every signed-in user, just the people on that team.
async function getTeamMembers(req, res) {
  const { id } = req.params;
  const team = await Team.findById(id);
  if (!team) throw ApiError.notFound("Team not found.");

  const requester = await User.findById(req.user.id);
  if (!requester.teamId || requester.teamId.toString() !== id) {
    throw ApiError.forbidden("Only members of this team can see its roster.");
  }

  const members = await User.find({ teamId: id }).select("firstName lastName email profilePicture fitnessLevel");
  res.json(members);
}

module.exports = { createTeam, getTeamById, getAllTeams, updateTeam, joinTeam, leaveTeam, getTeamMembers };
