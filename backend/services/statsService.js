const mongoose = require("mongoose");
const Activity = require("../models/Activity");
const User = require("../models/User");
const ChallengeParticipant = require("../models/ChallengeParticipant");
const { dayKey, dayNumber, addDays } = require("../utils/zonedTime");
const { currentStreak } = require("./achievementService");

/** The longest run of consecutive calendar days in a sorted list of day keys. */
function longestRun(sortedDays) {
  let best = 0;
  let run = 0;
  let prev = null;
  for (const day of sortedDays) {
    const number = dayNumber(day);
    run = prev !== null && number - prev === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = number;
  }
  return best;
}

/** The biggest single-day total for one unit, and the day it happened. */
function bestDay(totals) {
  let best = null;
  for (const [day, value] of totals) if (!best || value > best.value) best = { value, date: day };
  return best;
}

/**
 * Everything the dashboard and profile show about you that comes straight
 * from your logged activity: today, the last 7 days, streaks, lifetime
 * totals and personal bests. Computed on read, never stored.
 *
 * Every "day" below is a calendar day in the signed-in user's IANA zone, not
 * a UTC day: 23:30 in Lagos is already tomorrow there. Day keys stay strings
 * so a 23- or 25-hour DST day is still exactly one step in a chart or streak.
 */
async function computeStats(userId) {
  const uid = new mongoose.Types.ObjectId(String(userId));
  const [activities, challengesCompleted, user] = await Promise.all([
    Activity.find({ user: uid }).select("value unit duration calories recordedAt").lean(),
    ChallengeParticipant.countDocuments({ user: uid, completed: true }),
    User.findById(uid).select("timezone").lean(),
  ]);

  const timeZone = user?.timezone || "UTC";
  const now = new Date();
  const today = dayKey(now, timeZone);
  const stepsByDay = new Map();
  const repsByDay = new Map();
  const days = new Set();
  let lifetimeSteps = 0;
  let lifetimeReps = 0;
  let activeMinutesToday = 0;
  let caloriesToday = 0;
  let longestHold = null;

  for (const a of activities) {
    const day = dayKey(a.recordedAt, timeZone);
    days.add(day);
    if (a.unit === "steps") {
      stepsByDay.set(day, (stepsByDay.get(day) ?? 0) + a.value);
      lifetimeSteps += a.value;
    } else if (a.unit === "reps") {
      repsByDay.set(day, (repsByDay.get(day) ?? 0) + a.value);
      lifetimeReps += a.value;
    } else if (a.unit === "seconds" && (!longestHold || a.value > longestHold.value)) {
      longestHold = { value: a.value, date: day };
    }
    if (day === today) {
      activeMinutesToday += a.duration ?? (a.unit === "minutes" ? a.value : 0);
      caloriesToday += a.calories ?? 0;
    }
  }

  const week = Array.from({ length: 7 }, (_, i) => {
    const date = dayKey(addDays(now, timeZone, i - 6), timeZone);
    return { date, steps: stepsByDay.get(date) ?? 0 };
  });
  const thisWeek = week.reduce((sum, d) => sum + d.steps, 0);
  let lastWeek = 0;
  for (let i = 7; i < 14; i++) {
    lastWeek += stepsByDay.get(dayKey(addDays(now, timeZone, -i), timeZone)) ?? 0;
  }

  const dayList = [...days].sort();
  const streak = currentStreak(dayList, now, timeZone);

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
