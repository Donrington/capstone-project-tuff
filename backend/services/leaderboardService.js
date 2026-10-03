const Activity = require("../models/Activity");
const Challenge = require("../models/Challenge");
const Team = require("../models/Team");
const User = require("../models/User");
const { currentStreak } = require("./achievementService");

const DAY_MS = 24 * 60 * 60 * 1000;
const BOARD_SIZE = 50;
const STREAK_LOOKBACK_DAYS = 90;

/** Monday 00:00 UTC of the week holding `now` — the week the frontend's demo data uses too. */
function weekStart(now = Date.now()) {
  const d = new Date(now);
  const midnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return midnight - ((d.getUTCDay() + 6) % 7) * DAY_MS;
}

/** The [from, to) window a period covers. All-time and this week are open-ended. */
function windowFor(period, now = Date.now()) {
  if (period === "all-time") return { from: null, to: null };
  return { from: weekStart(now), to: null };
}

/**
 * Points per user from activity recorded in [from, to): each entry's value ×
 * its challenge's pointsPerUnit. Both periods come from Activity so a week's
 * total can never exceed the all-time one.
 */
async function pointsByUser({ from, to }) {
  const recordedAt = {};
  if (from !== null) recordedAt.$gte = new Date(from);
  if (to !== null) recordedAt.$lt = new Date(to);

  const rows = await Activity.aggregate([
    { $match: { challenge: { $ne: null }, ...(from !== null || to !== null ? { recordedAt } : {}) } },
    { $lookup: { from: Challenge.collection.name, localField: "challenge", foreignField: "_id", as: "c" } },
    { $unwind: "$c" },
    { $group: { _id: "$user", points: { $sum: { $multiply: ["$value", "$c.pointsPerUnit"] } } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.points]));
}

const fullName = (u) => `${u.firstName} ${u.lastName}`.trim();
const initialsOf = (u) => `${u.firstName?.[0] ?? ""}${u.lastName?.[0] ?? ""}`.toUpperCase();

/** Competition ranking: ties share a rank and the next rank skips (1, 2, 2, 4). */
function rankRows(rows, scoreOf) {
  let rank = 0;
  let prevScore = null;
  return rows.map((row, i) => {
    const score = scoreOf(row);
    if (score !== prevScore) rank = i + 1;
    prevScore = score;
    return { ...row, rank };
  });
}

/** Everyone with points in the window who's opted in to public boards, best first. */
async function rankedUsers(window) {
  const points = await pointsByUser(window);
  const ids = [...points.keys()].filter((id) => points.get(id) > 0);
  const users = await User.find({
    _id: { $in: ids },
    "privacy.showOnLeaderboards": { $ne: false },
    status: { $ne: "suspended" },
  })
    .select("firstName lastName displayName teamId")
    .lean();

  const rows = users
    .map((u) => ({ user: u, score: Math.round(points.get(String(u._id))) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || fullName(a.user).localeCompare(fullName(b.user)));
  return rankRows(rows, (r) => r.score);
}

/**
 * GET /api/leaderboard?period=week|all-time — the top BOARD_SIZE, plus the
 * viewer's own row when they're further down, so the page can always pin "You".
 * `previousRank` (week only) is where they finished last week.
 */
async function individualBoard(period, viewerId, now = Date.now()) {
  const ranked = await rankedUsers(windowFor(period, now));

  let previous = new Map();
  if (period === "week") {
    const start = weekStart(now);
    const lastWeek = await rankedUsers({ from: start - 7 * DAY_MS, to: start });
    previous = new Map(lastWeek.map((r) => [String(r.user._id), r.rank]));
  }

  const shown = ranked.filter((r, i) => i < BOARD_SIZE || String(r.user._id) === String(viewerId));
  const teamIds = [...new Set(shown.map((r) => r.user.teamId).filter(Boolean).map(String))];
  const teams = await Team.find({ _id: { $in: teamIds } }).select("name").lean();
  const teamName = new Map(teams.map((t) => [String(t._id), t.name]));

  return shown.map((r) => {
    const id = String(r.user._id);
    return {
      rank: r.rank,
      ...(previous.has(id) ? { previousRank: previous.get(id) } : {}),
      user: { id, name: r.user.displayName || fullName(r.user), initials: initialsOf(r.user) },
      teamName: r.user.teamId ? (teamName.get(String(r.user.teamId)) ?? "") : "",
      score: r.score,
      scoreUnit: "pts",
    };
  });
}

/** Days in a row, back from today, on which every member logged something. */
function teamStreak(memberIds, daysByUser, now) {
  if (memberIds.length === 0) return 0;
  const [first, ...rest] = memberIds.map((id) => daysByUser.get(id) ?? new Set());
  const everyone = [...first].filter((day) => rest.every((days) => days.has(day)));
  return currentStreak(everyone, new Date(now));
}

/**
 * GET /api/leaderboard/teams?period=week|all-time — every team that scored in
 * the period, best first (a team with no points yet isn't ranked, so a quiet
 * Monday doesn't hand every team a tied #1). Points sum each current member's
 * points, including members who've opted out of public boards — they aren't
 * named anywhere, but their effort still counts for their team. The
 * per-member breakdown is only included for the viewer's own team: rosters
 * are members-only.
 */
async function teamStandings(period, viewerId, now = Date.now()) {
  const [teams, points, viewer] = await Promise.all([
    Team.find({ status: { $ne: "inactive" } }).select("name").lean(),
    pointsByUser(windowFor(period, now)),
    User.findById(viewerId).select("teamId").lean(),
  ]);
  const members = await User.find({ teamId: { $in: teams.map((t) => t._id) } })
    .select("teamId")
    .lean();

  const membersByTeam = new Map();
  for (const m of members) {
    const key = String(m.teamId);
    if (!membersByTeam.has(key)) membersByTeam.set(key, []);
    membersByTeam.get(key).push(String(m._id));
  }

  const lookback = new Date(Date.UTC(...ymd(now)) - STREAK_LOOKBACK_DAYS * DAY_MS);
  const dayRows = await Activity.aggregate([
    { $match: { user: { $in: members.map((m) => m._id) }, recordedAt: { $gte: lookback } } },
    { $group: { _id: { user: "$user", day: { $dateToString: { format: "%Y-%m-%d", date: "$recordedAt" } } } } },
  ]);
  const daysByUser = new Map();
  for (const { _id } of dayRows) {
    const key = String(_id.user);
    if (!daysByUser.has(key)) daysByUser.set(key, new Set());
    daysByUser.get(key).add(_id.day);
  }

  const viewerTeam = viewer?.teamId ? String(viewer.teamId) : null;
  const rows = teams
    .filter((t) => membersByTeam.has(String(t._id)))
    .map((t) => {
      const id = String(t._id);
      const ids = membersByTeam.get(id);
      const memberPoints = ids.map((uid) => ({ id: uid, points: Math.round(points.get(uid) ?? 0) }));
      return {
        id,
        name: t.name,
        points: memberPoints.reduce((sum, m) => sum + m.points, 0),
        memberCount: ids.length,
        streakDays: teamStreak(ids, daysByUser, now),
        ...(id === viewerTeam ? { members: memberPoints.sort((a, b) => b.points - a.points) } : {}),
      };
    })
    .filter((t) => t.points > 0)
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

  return rankRows(rows, (r) => r.points).map(({ rank, ...rest }) => ({ rank, ...rest }));
}

function ymd(ms) {
  const d = new Date(ms);
  return [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()];
}

module.exports = { individualBoard, teamStandings, weekStart };
