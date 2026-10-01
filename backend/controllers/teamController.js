const Team = require("../models/Team");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const { notify, notifyMany, bestEffort } = require("../services/notificationService");
const { evaluateAchievements } = require("../services/achievementService");
const Activity = require("../models/Activity");
const { toActivityEntry, USER_FIELDS, CHALLENGE_FIELDS, limitFrom } = require("../utils/serializeActivity");

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
  // Member counts in one query, not one per team.
  const counts = await User.aggregate([
    { $match: { teamId: { $in: teams.map((t) => t._id) } } },
    { $group: { _id: "$teamId", count: { $sum: 1 } } },
  ]);
  const countOf = new Map(counts.map((c) => [c._id.toString(), c.count]));
  res.json(teams.map((t) => ({ ...t.toObject(), memberCount: countOf.get(t._id.toString()) ?? 0 })));
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

// GET /api/teams/code/:code — a team by its invite code, for the join
// preview: enough to decide whether to join, no roster.
async function getTeamByCode(req, res) {
  const code = String(req.params.code ?? "")
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase();
  const team = await Team.findOne({ inviteCode: code, status: "active" });
  if (!team) throw ApiError.notFound("No team has that code.");
  const memberCount = await User.countDocuments({ teamId: team._id });
  res.json({
    id: team._id.toString(),
    name: team.name,
    description: team.description,
    inviteCode: team.inviteCode,
    memberCount,
    maxMembers: team.maxMembers,
  });
}

// GET /api/teams/:id/activity?limit= — what the team has logged, newest
// first. Members only, like the roster.
async function getTeamActivity(req, res) {
  const { id } = req.params;
  const requester = await User.findById(req.user.id);
  if (!requester?.teamId || requester.teamId.toString() !== id) {
    throw ApiError.forbidden("Only members of this team can see its activity.");
  }
  const memberIds = (await User.find({ teamId: id }).select("_id")).map((u) => u._id);
  const activities = await Activity.find({ user: { $in: memberIds } })
    .sort({ recordedAt: -1 })
    .limit(limitFrom(req.query, 30, 200))
    .populate("user", USER_FIELDS)
    .populate("challenge", CHALLENGE_FIELDS);
  res.json(activities.map(toActivityEntry));
}

module.exports = {
  createTeam,
  getTeamById,
  getAllTeams,
  updateTeam,
  joinTeam,
  leaveTeam,
  getTeamMembers,
  getTeamByCode,
  getTeamActivity,
};
