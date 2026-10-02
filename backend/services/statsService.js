const mongoose = require("mongoose");
const Activity = require("../models/Activity");
const ChallengeParticipant = require("../models/ChallengeParticipant");
const { currentStreak } = require("./achievementService");

const DAY_MS = 24 * 60 * 60 * 1000;

/** UTC midnight, as ms. Days are UTC for now — TODO(timezones), same as streaks. */
const dayStart = (date) => {
  const d = new Date(date);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};
const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);

/** The longest run of consecutive days in a sorted list of day starts. */
function longestRun(sortedDays) {
  let best = 0;
  let run = 0;
  let prev = null;
  for (const day of sortedDays) {
    run = prev !== null && day - prev === DAY_MS ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return best;
}

/** The biggest single-day total for one unit, and the day it happened. */
function bestDay(totals) {
  let best = null;
  for (const [day, value] of totals) if (!best || value > best.value) best = { value, date: isoDay(day) };
  return best;
}

/**
 * Everything the dashboard and profile show about you that comes straight
 * from your logged activity: today, the last 7 days, streaks, lifetime
 * totals and personal bests. Computed on read, never stored.
 */
async function computeStats(userId) {
  const uid = new mongoose.Types.ObjectId(String(userId));
  const [activities, challengesCompleted] = await Promise.all([
    Activity.find({ user: uid }).select("value unit duration calories recordedAt").lean(),
    ChallengeParticipant.countDocuments({ user: uid, completed: true }),
  ]);

  const today = dayStart(Date.now());
  const stepsByDay = new Map();
  const repsByDay = new Map();
  const days = new Set();
  let lifetimeSteps = 0;
  let lifetimeReps = 0;
  let activeMinutesToday = 0;
  let caloriesToday = 0;
  let longestHold = null;

  for (const a of activities) {
    const day = dayStart(a.recordedAt);
    days.add(day);
    if (a.unit === "steps") {
      stepsByDay.set(day, (stepsByDay.get(day) ?? 0) + a.value);
      lifetimeSteps += a.value;
    } else if (a.unit === "reps") {
      repsByDay.set(day, (repsByDay.get(day) ?? 0) + a.value);
      lifetimeReps += a.value;
    } else if (a.unit === "seconds" && (!longestHold || a.value > longestHold.value)) {
      longestHold = { value: a.value, date: isoDay(day) };
    }
    if (day === today) {
      activeMinutesToday += a.duration ?? (a.unit === "minutes" ? a.value : 0);
      caloriesToday += a.calories ?? 0;
    }
  }

  const week = Array.from({ length: 7 }, (_, i) => {
    const day = today - (6 - i) * DAY_MS;
    return { date: isoDay(day), steps: stepsByDay.get(day) ?? 0 };
  });
  const thisWeek = week.reduce((sum, d) => sum + d.steps, 0);
  let lastWeek = 0;
  for (let i = 7; i < 14; i++) lastWeek += stepsByDay.get(today - i * DAY_MS) ?? 0;

  const dayList = [...days].sort((a, b) => a - b);
  const streak = currentStreak(dayList.map(isoDay));

  return {
    today: { steps: stepsByDay.get(today) ?? 0, activeMinutes: Math.round(activeMinutesToday), calories: Math.round(caloriesToday) },
    streakDays: streak,
    bestStreak: Math.max(streak, longestRun(dayList)),
    week,
    // Week on week, by steps. Null until there's a previous week to compare.
    weeklyDeltaPct: lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null,
    lifetime: { steps: lifetimeSteps, reps: lifetimeReps },
    challengesCompleted,
    personalBests: {
      mostStepsInADay: bestDay(stepsByDay),
      mostRepsInADay: bestDay(repsByDay),
      longestHoldSeconds: longestHold,
    },
  };
}

module.exports = { computeStats };
