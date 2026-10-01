const mongoose = require("mongoose");
const Achievement = require("../models/Achievement");
const UserAchievement = require("../models/UserAchievement");
const Activity = require("../models/Activity");
const ChallengeParticipant = require("../models/ChallengeParticipant");
const User = require("../models/User");
const catalog = require("../data/achievements");
const { notify } = require("./notificationService");

/** Upserts data/achievements.js into the collection by name. Runs on boot. */
async function syncAchievementCatalog() {
  if (catalog.length === 0) return;
  await Achievement.bulkWrite(
    catalog.map((a) => ({
      updateOne: { filter: { name: a.name }, update: { $set: a }, upsert: true },
    })),
  );
}

function parseRequirement(requirement) {
  const [metric, target] = String(requirement).split(":");
  const n = Number(target);
  return Number.isFinite(n) && n > 0 ? { metric, target: n } : null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD" in UTC. Streaks are counted in UTC days for now —
 *  TODO(timezones): store the user's timezone and count local days. */
function utcDay(date) {
  return new Date(date).toISOString().slice(0, 10);
}

/** Consecutive days with any activity, counting back from today — or from
 *  yesterday if nothing's logged yet today, since the streak isn't broken
 *  until today ends. */
function currentStreak(daysWithActivity, now = new Date()) {
  const days = new Set(daysWithActivity);
  let cursor = now.getTime();
  if (!days.has(utcDay(cursor))) cursor -= DAY_MS;
  let streak = 0;
  while (days.has(utcDay(cursor))) {
    streak++;
    cursor -= DAY_MS;
  }
  return streak;
}

async function maxInOneDay(userObjectId, unit) {
  const [row] = await Activity.aggregate([
    { $match: { user: userObjectId, unit } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$recordedAt" } }, total: { $sum: "$value" } } },
    { $sort: { total: -1 } },
    { $limit: 1 },
  ]);
  return row?.total ?? 0;
}

/** Every metric a requirement can name, computed fresh from the data. */
async function computeMetrics(userId) {
  const uid = new mongoose.Types.ObjectId(String(userId));
  const [activitiesLogged, challengesCompleted, user, dayRows, repsInDay, stepsInDay] = await Promise.all([
    Activity.countDocuments({ user: uid }),
    ChallengeParticipant.countDocuments({ user: uid, completed: true }),
    User.findById(uid).select("teamId"),
    Activity.aggregate([
      { $match: { user: uid, recordedAt: { $gte: new Date(Date.now() - 400 * DAY_MS) } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$recordedAt" } } } },
    ]),
    maxInOneDay(uid, "reps"),
    maxInOneDay(uid, "steps"),
  ]);
  return {
    activities_logged: activitiesLogged,
    challenges_completed: challengesCompleted,
    team_joined: user?.teamId ? 1 : 0,
    streak_days: currentStreak(dayRows.map((r) => r._id)),
    reps_in_day: repsInDay,
    steps_in_day: stepsInDay,
  };
}

/**
 * Awards every achievement the user now qualifies for and hasn't earned,
 * and sends an "unlocked" notification for each. Safe to call as often as
 * you like — the unique (user, achievement) index makes a double award
 * impossible even if two requests race. Returns the newly earned ones.
 */
async function evaluateAchievements(userId) {
  const [all, earned, metrics] = await Promise.all([
    Achievement.find(),
    UserAchievement.find({ user: userId }).select("achievement"),
    computeMetrics(userId),
  ]);
  const earnedIds = new Set(earned.map((e) => e.achievement.toString()));

  const newlyEarned = [];
  for (const achievement of all) {
    if (earnedIds.has(achievement._id.toString())) continue;
    const rule = parseRequirement(achievement.requirement);
    if (!rule || !(rule.metric in metrics) || metrics[rule.metric] < rule.target) continue;

    try {
      const ua = await UserAchievement.create({ user: userId, achievement: achievement._id });
      newlyEarned.push({ achievement, earnedAt: ua.earnedAt });
    } catch (err) {
      if (err.code === 11000) continue; // a concurrent request awarded it first
      throw err;
    }
    await notify(userId, {
      type: "achievement",
      title: `${achievement.name} unlocked`,
      message: achievement.description,
    });
  }
  return newlyEarned.map(({ achievement, earnedAt }) => toAchievementJson(achievement, earnedAt));
}

function toAchievementJson(achievement, earnedAt, progress) {
  const out = {
    id: achievement._id.toString(),
    name: achievement.name,
    description: achievement.description,
    requirement: achievement.requirement,
    icon: achievement.icon,
    points: achievement.points,
    earnedAt: earnedAt ?? null,
  };
  if (progress) out.progress = progress;
  return out;
}

/** The whole catalog from one user's point of view: earned ones carry
 *  earnedAt; locked ones carry progress toward their target. */
async function listForUser(userId) {
  const [all, earned, metrics] = await Promise.all([
    Achievement.find().sort({ points: 1, name: 1 }),
    UserAchievement.find({ user: userId }),
    computeMetrics(userId),
  ]);
  const earnedAt = new Map(earned.map((e) => [e.achievement.toString(), e.earnedAt]));

  return all.map((a) => {
    const at = earnedAt.get(a._id.toString());
    if (at) return toAchievementJson(a, at);
    const rule = parseRequirement(a.requirement);
    const progress = rule && rule.metric in metrics ? { current: Math.min(metrics[rule.metric], rule.target), target: rule.target } : undefined;
    return toAchievementJson(a, null, progress);
  });
}

module.exports = { syncAchievementCatalog, evaluateAchievements, listForUser, computeMetrics, currentStreak };
