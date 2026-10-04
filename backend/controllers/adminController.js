const mongoose = require("mongoose");
const User = require("../models/User");
const Team = require("../models/Team");
const Challenge = require("../models/Challenge");
const ChallengeParticipant = require("../models/ChallengeParticipant");
const Activity = require("../models/Activity");
const RefreshToken = require("../models/RefreshToken");
const ApiError = require("../utils/ApiError");

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_PAGE_SIZE = 50;
const SIGNUP_DAYS = 14;

const USER_STATUSES = ["active", "inactive", "suspended"];
const CHALLENGE_STATUSES = ["draft", "upcoming", "active", "completed", "cancelled"];

const utcMidnight = (ms) => {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

/** `?page=&limit=` → a safe skip/limit, plus the page number echoed back. */
function paging(query, fallbackLimit = 20) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || fallbackLimit, 1), MAX_PAGE_SIZE);
  return { page, limit, skip: (page - 1) * limit };
}

const pageOf = (rows, total, { page, limit }) => ({ rows, total, page, pages: Math.max(1, Math.ceil(total / limit)) });

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const fullName = (u) => (u ? `${u.firstName} ${u.lastName}`.trim() : "Deleted user");
const idsOf = (docs) => docs.map((d) => d._id);

/** What an admin sees of an account: enough to moderate it, never the hash or the Google id. */
function toAdminUser(user, extra = {}) {
  return {
    id: user._id.toString(),
    name: fullName(user),
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    profilePicture: user.profilePicture ?? null,
    teamName: null,
    activityCount: 0,
    lastActiveAt: null,
    ...extra,
  };
}

// GET /api/admin/overview — the numbers at the top of the dashboard.
async function getOverview(req, res) {
  const now = Date.now();
  const weekAgo = new Date(now - 7 * DAY_MS);
  const firstDay = utcMidnight(now) - (SIGNUP_DAYS - 1) * DAY_MS;

  const [users, admins, suspended, newUsers, teams, byStatus, activities, recentActivities, activeRows, signupRows] =
    await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ status: "suspended" }),
      User.countDocuments({ createdAt: { $gte: weekAgo } }),
      Team.countDocuments({ status: { $ne: "inactive" } }),
      Challenge.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Activity.countDocuments(),
      Activity.countDocuments({ recordedAt: { $gte: weekAgo } }),
      Activity.aggregate([{ $match: { recordedAt: { $gte: weekAgo } } }, { $group: { _id: "$user" } }, { $count: "n" }]),
      User.aggregate([
        { $match: { createdAt: { $gte: new Date(firstDay) } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
      ]),
    ]);

  const challengeCounts = Object.fromEntries(CHALLENGE_STATUSES.map((s) => [s, 0]));
  for (const row of byStatus) challengeCounts[row._id] = row.count;

  const signupsByDay = new Map(signupRows.map((r) => [r._id, r.count]));
  const signups = Array.from({ length: SIGNUP_DAYS }, (_, i) => {
    const date = new Date(firstDay + i * DAY_MS).toISOString().slice(0, 10);
    return { date, count: signupsByDay.get(date) ?? 0 };
  });

  res.json({
    users: { total: users, admins, suspended, newLast7Days: newUsers, activeLast7Days: activeRows[0]?.n ?? 0 },
    teams,
    challenges: { total: Object.values(challengeCounts).reduce((a, b) => a + b, 0), byStatus: challengeCounts },
    activities: { total: activities, last7Days: recentActivities },
    signups,
  });
}

// GET /api/admin/users?q=&status=&role=&page=&limit= — newest first.
async function listUsers(req, res) {
  const filter = {};
  const q = String(req.query.q ?? "").trim().slice(0, 100);
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ firstName: rx }, { lastName: rx }, { email: rx }];
  }
  if (req.query.status && req.query.status !== "all") {
    if (!USER_STATUSES.includes(req.query.status)) throw ApiError.badRequest("Unknown status.");
    filter.status = req.query.status;
  }
  if (req.query.role && req.query.role !== "all") {
    if (!["member", "admin"].includes(req.query.role)) throw ApiError.badRequest("Unknown role.");
    filter.role = req.query.role;
  }

  const paged = paging(req.query);
  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter).sort({ createdAt: -1, _id: -1 }).skip(paged.skip).limit(paged.limit).lean(),
  ]);

  const [teams, activity] = await Promise.all([
    Team.find({ _id: { $in: users.map((u) => u.teamId).filter(Boolean) } }).select("name").lean(),
    Activity.aggregate([
      { $match: { user: { $in: idsOf(users) } } },
      { $group: { _id: "$user", count: { $sum: 1 }, last: { $max: "$recordedAt" } } },
    ]),
  ]);
  const teamName = new Map(teams.map((t) => [String(t._id), t.name]));
  const stats = new Map(activity.map((a) => [String(a._id), a]));

  const rows = users.map((u) =>
    toAdminUser(u, {
      teamName: u.teamId ? (teamName.get(String(u.teamId)) ?? null) : null,
      activityCount: stats.get(String(u._id))?.count ?? 0,
      lastActiveAt: stats.get(String(u._id))?.last ?? null,
    }),
  );
  res.json(pageOf(rows, total, paged));
}

// PATCH /api/admin/users/:id — { status?: "active" | "suspended", role?: "member" | "admin" }.
// Suspending also revokes the refresh tokens, so the person is signed out
// when their short-lived access token lapses (and can't sign back in).
async function updateUser(req, res) {
  const { id } = req.params;
  const { status, role } = req.body ?? {};

  if (!mongoose.isValidObjectId(id)) throw ApiError.notFound("User not found.");
  if (status === undefined && role === undefined) throw ApiError.badRequest("Send a status or a role to change.");
  if (status !== undefined && !["active", "suspended"].includes(status)) {
    throw ApiError.badRequest('status must be "active" or "suspended".');
  }
  if (role !== undefined && !["member", "admin"].includes(role)) {
    throw ApiError.badRequest('role must be "member" or "admin".');
  }
  // Your own account is off limits: it's how an admin locks themselves (or the
  // whole app) out. Another admin can change it, and since whoever's calling
  // is an active admin who isn't the target, one always remains.
  if (id === req.user.id) throw ApiError.forbidden("You can't change your own role or status.");

  const changes = {};
  if (status !== undefined) changes.status = status;
  if (role !== undefined) changes.role = role;

  const user = await User.findByIdAndUpdate(id, { $set: changes }, { new: true, runValidators: true });
  if (!user) throw ApiError.notFound("User not found.");
  if (status === "suspended") await RefreshToken.deleteMany({ user: user._id });

  console.log(`[admin] ${req.user.id} changed user ${id}: ${JSON.stringify(changes)}`);
  res.json(toAdminUser(user));
}

// GET /api/admin/challenges?status=&page=&limit= — newest first.
async function listChallenges(req, res) {
  const filter = {};
  if (req.query.status && req.query.status !== "all") {
    if (!CHALLENGE_STATUSES.includes(req.query.status)) throw ApiError.badRequest("Unknown status.");
    filter.status = req.query.status;
  }

  const paged = paging(req.query);
  const [total, challenges] = await Promise.all([
    Challenge.countDocuments(filter),
    Challenge.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(paged.skip)
      .limit(paged.limit)
      .populate("createdBy", "firstName lastName")
      .populate("teamId", "name")
      .lean(),
  ]);

  const counts = await ChallengeParticipant.aggregate([
    { $match: { challenge: { $in: idsOf(challenges) } } },
    { $group: { _id: "$challenge", n: { $sum: 1 } } },
  ]);
  const participants = new Map(counts.map((c) => [String(c._id), c.n]));

  const rows = challenges.map((c) => ({
    id: c._id.toString(),
    title: c.title,
    type: c.type,
    unit: c.unit,
    goal: c.goal,
    status: c.status,
    teamName: c.teamId?.name ?? null,
    createdBy: fullName(c.createdBy),
    participants: participants.get(String(c._id)) ?? 0,
    startDate: c.startDate,
    endDate: c.endDate,
    createdAt: c.createdAt,
  }));
  res.json(pageOf(rows, total, paged));
}

// PATCH /api/admin/challenges/:id — { status: "cancelled" }. Cancelling is the
// one moderation move: it ends the challenge for everyone and stops logging.
async function updateChallenge(req, res) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw ApiError.notFound("Challenge not found.");
  if (req.body?.status !== "cancelled") throw ApiError.badRequest('The only change allowed is status "cancelled".');

  const challenge = await Challenge.findById(id);
  if (!challenge) throw ApiError.notFound("Challenge not found.");
  if (challenge.status === "completed" || challenge.status === "cancelled") {
    throw ApiError.conflict(`That challenge is already ${challenge.status}.`);
  }

  challenge.status = "cancelled";
  await challenge.save();
  console.log(`[admin] ${req.user.id} cancelled challenge ${id}`);
  res.json({ id: challenge._id.toString(), status: challenge.status });
}

// GET /api/admin/teams?page=&limit= — newest first, with member counts.
async function listTeams(req, res) {
  const paged = paging(req.query);
  const [total, teams] = await Promise.all([
    Team.countDocuments(),
    Team.find().sort({ createdAt: -1, _id: -1 }).skip(paged.skip).limit(paged.limit).populate("createdBy", "firstName lastName").lean(),
  ]);

  const counts = await User.aggregate([
    { $match: { teamId: { $in: idsOf(teams) } } },
    { $group: { _id: "$teamId", n: { $sum: 1 } } },
  ]);
  const members = new Map(counts.map((c) => [String(c._id), c.n]));

  const rows = teams.map((t) => ({
    id: t._id.toString(),
    name: t.name,
    status: t.status,
    members: members.get(String(t._id)) ?? 0,
    maxMembers: t.maxMembers,
    createdBy: fullName(t.createdBy),
    createdAt: t.createdAt,
  }));
  res.json(pageOf(rows, total, paged));
}

module.exports = { getOverview, listUsers, updateUser, listChallenges, updateChallenge, listTeams };
