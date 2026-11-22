const Team = require("../models/Team");
const User = require("../models/User");
const MatchupReaction = require("../models/MatchupReaction");
const leaderboard = require("./leaderboardService");

const EMOJIS = MatchupReaction.EMOJIS;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const emptyCounts = () => ({ fire: 0, muscle: 0, clap: 0, grit: 0 });

/**
 * Counts plus the viewer's own pick for one team/week. Loading the handful of
 * documents instead of aggregating keeps every query free of `$` operators
 * (mongoose sanitizeFilter is on) and is plenty for a team roster.
 */
async function reactionState(teamId, start, userId) {
  const docs = await MatchupReaction.find({ team: teamId, weekStart: new Date(start) })
    .select("emoji user")
    .lean();
  const counts = emptyCounts();
  let mine = null;
  for (const doc of docs) {
    if (EMOJIS.includes(doc.emoji)) counts[doc.emoji] += 1;
    if (String(doc.user) === String(userId)) mine = doc.emoji;
  }
  return { counts, mine };
}

/** Top three by this window's points. Only the rival side is abbreviated: we
 *  promised members that their own roster reads as full names, while another
 *  crew's contributors don't need their full surnames on a rival card. */
async function topContributors(teamId, points, rival = false) {
  if (!teamId) return [];
  const members = await User.find({ teamId }).select("firstName lastName displayName").lean();
  return members
    .map((u) => ({
      name: rival
        ? `${u.firstName ?? ""}${u.lastName ? ` ${u.lastName[0]}.` : ""}`.trim()
        : u.displayName || `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
      initials: `${u.firstName?.[0] ?? ""}${u.lastName?.[0] ?? ""}`.toUpperCase(),
      points: Math.round(points.get(String(u._id)) ?? 0),
    }))
    .filter((m) => m.points > 0)
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
    .slice(0, 3);
}

/** The live card: one shared UTC week, one ranking, one set of scores. */
async function getMatchup(teamId, userId, now = Date.now()) {
  const { start, end } = leaderboard.weekBounds(now);
  // Identical to windowFor("week") in leaderboardService: open-ended, so a
  // point logged now shows up on the next poll. The displayed end is just a date.
  const window = { from: start, to: null };
  const points = await leaderboard.pointsByUser(window);
  const ranks = await leaderboard.teamRanksForWindow(window, points);
  const team = await Team.findById(teamId).select("name rivalLine").lean();
  const id = String(team?._id ?? teamId);
  const row = ranks.find((r) => r.id === id);
  const rivalId = row?.rivalId ?? null;
  const rivalRow = rivalId ? ranks.find((r) => r.id === rivalId) : null;

  const [teamContributors, rivalContributors, reactions] = await Promise.all([
    topContributors(id, points),
    topContributors(rivalId, points, true),
    reactionState(id, start, userId),
  ]);

  return {
    weekStart: new Date(start).toISOString(),
    weekEnd: new Date(end).toISOString(),
    team: { id, name: team?.name ?? "", points: row?.points ?? 0 },
    rival: rivalRow ? { id: rivalRow.id, name: rivalRow.name, points: rivalRow.points } : null,
    topContributors: { team: teamContributors, rival: rivalContributors },
    reactions,
    // Stale banter about a rival we no longer have would just be confusing.
    rivalLine: rivalRow ? (team?.rivalLine ?? null) : null,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Completed weeks, newest first, computed from Activity — there is no stored
 * history. Each week uses its own finished UTC window and the same rank rule
 * as the live card; a week with no rival is skipped rather than invented.
 */
async function getResults(teamId, weeks, now = Date.now()) {
  const thisWeek = leaderboard.weekBounds(now).start;
  const id = String(teamId);
  const results = [];
  for (let i = 1; i <= weeks; i += 1) {
    const from = thisWeek - i * WEEK_MS;
    const window = { from, to: from + WEEK_MS };
    const points = await leaderboard.pointsByUser(window);
    const ranks = await leaderboard.teamRanksForWindow(window, points);
    const row = ranks.find((r) => r.id === id);
    const rivalId = row?.rivalId ?? null;
    const rival = rivalId ? ranks.find((r) => r.id === rivalId) : null;
    if (!row || !rival) continue;

    results.push({
      weekOf: new Date(from).toISOString(),
      opponentId: rival.id,
      opponentName: rival.name,
      outcome: row.points > rival.points ? "won" : row.points < rival.points ? "lost" : "drew",
      points: row.points,
      opponentPoints: rival.points,
    });
  }
  return results;
}

/** Upsert: a second tap changes the emoji on the same (team, week, user) row. */
async function setReaction(teamId, userId, emoji) {
  const start = leaderboard.weekBounds().start;
  await MatchupReaction.findOneAndUpdate(
    { team: teamId, weekStart: new Date(start), user: userId },
    { $set: { emoji } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return reactionState(teamId, start, userId);
}

async function clearReaction(teamId, userId) {
  const start = leaderboard.weekBounds().start;
  await MatchupReaction.deleteOne({ team: teamId, weekStart: new Date(start), user: userId });
  return reactionState(teamId, start, userId);
}

module.exports = { EMOJIS, getMatchup, getResults, setReaction, clearReaction, reactionState };
