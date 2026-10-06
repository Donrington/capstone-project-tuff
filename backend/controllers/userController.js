const bcrypt = require("bcryptjs");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const ChallengeParticipant = require("../models/ChallengeParticipant");
const Activity = require("../models/Activity");
const UserAchievement = require("../models/UserAchievement");
const Notification = require("../models/Notification");
const ApiError = require("../utils/ApiError");
const { toSafeUser } = require("../utils/serializeUser");
const { issueSession, clearSession } = require("../utils/session");
const { cloudinary, isCloudinaryConfigured, avatarPublicId } = require("../utils/cloudinary");
const { toActivityEntry, USER_FIELDS, CHALLENGE_FIELDS, limitFrom } = require("../utils/serializeActivity");
const { computeStats } = require("../services/statsService");
const { evaluateAchievements } = require("../services/achievementService");
const { bestEffort } = require("../services/notificationService");
const { flagReasonFor } = require("../utils/flagActivity");
const aiService = require("../services/aiService");

// The units describing-it-in-words can fill in — the same ones the log
// dialog's quick-add buttons cover (lib/data: QUICK_ADD). "minutes", "km"
// and "miles" challenges exist but have no quick-add UI yet either.
const PARSEABLE_UNITS = new Set(["reps", "steps", "seconds"]);

// GET /api/users/me/stats — today, the last 7 days, streaks, lifetime totals
// and personal bests, all computed from your logged activity.
async function getMyStats(req, res) {
  res.json(await computeStats(req.user.id));
}

// GET /api/users/me/activities?limit= — your own history, newest first.
async function getMyActivities(req, res) {
  const activities = await Activity.find({ user: req.user.id })
    .sort({ recordedAt: -1 })
    .limit(limitFrom(req.query, 20, 200))
    .populate("user", USER_FIELDS)
    .populate("challenge", CHALLENGE_FIELDS);
  res.json(activities.map(toActivityEntry));
}

const MAX_STEPS_PER_ENTRY = 100_000;
const BACKDATE_LIMIT_MS = 7 * 24 * 60 * 60 * 1000;
const CLOCK_SKEW_MS = 5 * 60 * 1000;

// POST /api/users/me/activities — log steps toward your daily goal without
// joining a challenge. They count for the Today ring, the week chart, streaks
// and achievements like any other entry; they earn no leaderboard points,
// which only come from challenges.
async function logDailySteps(req, res) {
  const { value, recordedAt } = req.body ?? {};
  if (!Number.isInteger(value) || value < 1 || value > MAX_STEPS_PER_ENTRY) {
    throw ApiError.badRequest(`value must be a whole number from 1 to ${MAX_STEPS_PER_ENTRY.toLocaleString("en-US")}.`);
  }

  let when = new Date();
  if (recordedAt !== undefined) {
    when = new Date(recordedAt);
    const age = Date.now() - when.getTime();
    if (Number.isNaN(when.getTime()) || age < -CLOCK_SKEW_MS || age > BACKDATE_LIMIT_MS) {
      throw ApiError.badRequest("recordedAt must be a date within the last 7 days.");
    }
  }

  const flagReason = flagReasonFor("steps", value);
  const activity = await Activity.create({
    user: req.user.id,
    challenge: null,
    type: "steps",
    value,
    unit: "steps",
    recordedAt: when,
    flagged: Boolean(flagReason),
    flagReason,
  });

  const [stats, newAchievements] = await Promise.all([
    computeStats(req.user.id),
    bestEffort("evaluate achievements", () => evaluateAchievements(req.user.id)),
  ]);
  res.status(201).json({
    activity: toActivityEntry(activity),
    todaySteps: stats.today.steps,
    newAchievements: newAchievements ?? [],
  });
}

const MAX_DESCRIBE_LENGTH = 300;

// POST /api/users/me/activities/parse — the log dialog's "describe it"
// field. Pulls a whole-number total in the given unit out of free text
// ("3 sets of 12 push-ups" -> 36), including simple arithmetic; never
// guesses at a conversion between units (a distance never becomes steps).
// It only fills in the amount field — the activity itself is still created
// through the normal validated endpoints, same as if the number had been
// typed by hand.
async function parseActivityText(req, res) {
  const text = String(req.body?.text ?? "").trim().slice(0, MAX_DESCRIBE_LENGTH);
  const unit = String(req.body?.unit ?? "");

  if (!PARSEABLE_UNITS.has(unit)) throw ApiError.badRequest("Unknown unit.");
  if (!text) throw ApiError.badRequest("Describe what you did.");
  if (!aiService.isConfigured()) throw ApiError.unavailable("Describing it in words isn't available right now.");

  const reply = await aiService.complete({
    system:
      `Extract a single whole-number total in "${unit}" from what someone typed about a workout. ` +
      "Do simple arithmetic if they described it as sets (\"3 sets of 12\" is 36). " +
      "Reply with ONLY the number, or the word NONE if there's no clear amount in that unit. " +
      "Never convert between units — a distance or a time never becomes a step count, and vice versa.",
    prompt: text,
    maxTokens: 20,
  });

  const cleaned = reply.trim();
  const value = Math.round(Number(cleaned));
  if (cleaned === "NONE" || !Number.isFinite(value) || value <= 0) {
    throw ApiError.badRequest(`Couldn't find a number of ${unit} in that — try the field below instead.`);
  }
  res.json({ value });
}

// The frontend resizes photos to a 320px JPEG before sending, so real
// uploads are ~30kb. This cap (~2MB decoded) is just a backstop.
const PHOTO_DATA_URL_RE = /^data:image\/(jpeg|png|webp|gif);base64,/;
const MAX_PHOTO_DATA_URL_LENGTH = 2_800_000;

async function findMe(req, select) {
  const query = User.findById(req.user.id);
  if (select) query.select(select);
  const user = await query;
  if (!user) throw ApiError.notFound();
  return user;
}

/** Copies only the listed keys that are actually present in the body, so a
 *  PATCH never blanks out a field the client didn't send. */
function pick(body, keys) {
  const out = {};
  for (const key of keys) if (body[key] !== undefined) out[key] = body[key];
  return out;
}

// PATCH /api/users/me — frontend: settings ProfileSection
async function updateProfile(req, res) {
  const user = await findMe(req);
  const updates = pick(req.body, ["firstName", "lastName", "displayName", "bio"]);

  const errors = {};
  if (updates.firstName !== undefined && !String(updates.firstName).trim()) errors.firstName = "Tell us what to call you.";
  if (updates.lastName !== undefined && !String(updates.lastName).trim()) errors.lastName = "Enter your last name.";
  if (Object.keys(errors).length > 0) throw ApiError.badRequest("Check the form and try again.", errors);

  user.set(updates);
  await user.save(); // schema maxlengths (bio 160, displayName 40) surface as a 400
  res.json(toSafeUser(user));
}

// PUT /api/users/me/photo — body: { dataUrl } to set, { dataUrl: null } to remove.
// Stored on Cloudinary at a fixed public ID per user (overwrite), so a new
// photo replaces the old one rather than leaving orphans behind.
async function updatePhoto(req, res) {
  if (!isCloudinaryConfigured()) throw ApiError.unavailable("Photo uploads aren't set up on this server yet.");

  const user = await findMe(req);
  const { dataUrl } = req.body;

  if (dataUrl === null) {
    await cloudinary.uploader.destroy(avatarPublicId(user.id), { invalidate: true });
    user.profilePicture = null;
    await user.save();
    res.json(toSafeUser(user));
    return;
  }

  if (typeof dataUrl !== "string" || !PHOTO_DATA_URL_RE.test(dataUrl)) {
    throw ApiError.badRequest("Use a JPEG, PNG, WebP or GIF image.");
  }
  if (dataUrl.length > MAX_PHOTO_DATA_URL_LENGTH) throw ApiError.badRequest("That photo is too large. Try one under 2MB.");

  let result;
  try {
    result = await cloudinary.uploader.upload(dataUrl, {
      public_id: avatarPublicId(user.id),
      overwrite: true,
      invalidate: true,
      resource_type: "image",
      transformation: [{ width: 320, height: 320, crop: "fill", gravity: "face" }],
    });
  } catch (err) {
    // A right-looking prefix over bytes that aren't really an image.
    if (err?.http_code === 400) throw ApiError.badRequest("We couldn't read that image. Try another one.");
    throw err;
  }

  // secure_url carries a version segment (/v1727.../), so the browser
  // fetches the new image even though the public ID didn't change.
  user.profilePicture = result.secure_url;
  await user.save();
  res.json(toSafeUser(user));
}

// PATCH /api/users/me/password — body: { currentPassword, newPassword }
// Signs out every other device: all refresh tokens are revoked, then this
// device gets a fresh session so the user stays signed in here.
async function updatePassword(req, res) {
  const currentPassword = String(req.body.currentPassword ?? "");
  const newPassword = String(req.body.newPassword ?? "");

  const errors = {};
  if (!currentPassword) errors.currentPassword = "Enter your current password.";
  if (newPassword.length < 8) errors.newPassword = "Use at least 8 characters.";
  if (Object.keys(errors).length > 0) throw ApiError.badRequest("Check the form and try again.", errors);

  const user = await findMe(req, "+passwordHash");
  if (!user.passwordHash) {
    throw ApiError.badRequest("Check the form and try again.", {
      currentPassword: "You sign in with Google, so there's no password to change.",
    });
  }
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) throw ApiError.badRequest("Check the form and try again.", { currentPassword: "That's not your current password." });

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();

  await RefreshToken.deleteMany({ user: user._id });
  await issueSession(res, user);
  res.status(204).end();
}

// PATCH /api/users/me/goals — body: { stepGoal?, workoutDaysPerWeek? }
async function updateGoals(req, res) {
  const user = await findMe(req);
  user.set(pick(req.body, ["stepGoal", "workoutDaysPerWeek"]));
  await user.save();
  res.json(toSafeUser(user));
}

const NOTIFICATION_PREF_KEYS = [
  "streakReminders",
  "teamActivity",
  "leaderboardChanges",
  "challengeInvites",
  "weeklySummary",
  "reminderTime",
];

// PATCH /api/users/me/notification-prefs — any subset of NOTIFICATION_PREF_KEYS
async function updateNotificationPrefs(req, res) {
  const user = await findMe(req);
  for (const [key, value] of Object.entries(pick(req.body, NOTIFICATION_PREF_KEYS))) {
    user.set(`notificationPrefs.${key}`, value);
  }
  await user.save();
  res.json(toSafeUser(user));
}

// PATCH /api/users/me/privacy — body: { showOnLeaderboards?, profileVisibility? }
async function updatePrivacy(req, res) {
  const user = await findMe(req);
  for (const [key, value] of Object.entries(pick(req.body, ["showOnLeaderboards", "profileVisibility"]))) {
    user.set(`privacy.${key}`, value);
  }
  await user.save();
  res.json(toSafeUser(user));
}

// POST /api/users/me/onboarding — every answer is optional ("Skip for now"
// on every step). Joining a challenge or team during onboarding goes through
// those resources' own endpoints; this only saves answers about the user.
async function completeOnboarding(req, res) {
  const user = await findMe(req);
  const answers = pick(req.body, [
    "motivations",
    "stepGoal",
    "dateOfBirth",
    "gender",
    "height",
    "weight",
    "fitnessLevel",
  ]);

  if (answers.dateOfBirth !== undefined && answers.dateOfBirth !== null) {
    const dob = new Date(answers.dateOfBirth);
    if (Number.isNaN(dob.getTime()) || dob > new Date()) {
      throw ApiError.badRequest("Check the form and try again.", { dateOfBirth: "Enter a real date of birth." });
    }
  }

  user.set(answers);
  user.onboardingCompletedAt = new Date();
  await user.save();
  res.json(toSafeUser(user));
}

// DELETE /api/users/me — body: { confirm: "DELETE" }
// Removes the user and everything that only means something with them in it.
// Teams and challenges they created are left alone: other people may be in
// them, and both outlive their creator by design.
async function deleteAccount(req, res) {
  if (req.body?.confirm !== "DELETE") {
    throw ApiError.badRequest("Type DELETE to confirm.", { confirm: "Type DELETE to confirm." });
  }

  const user = await findMe(req);

  if (user.profilePicture && isCloudinaryConfigured()) {
    // Best effort: a Cloudinary hiccup shouldn't block deleting the account.
    await cloudinary.uploader.destroy(avatarPublicId(user.id), { invalidate: true }).catch((err) => {
      console.error("Avatar cleanup failed for", user.id, err.message);
    });
  }

  await Promise.all([
    ChallengeParticipant.deleteMany({ user: user._id }),
    Activity.deleteMany({ user: user._id }),
    UserAchievement.deleteMany({ user: user._id }),
    Notification.deleteMany({ user: user._id }),
    RefreshToken.deleteMany({ user: user._id }),
  ]);
  await user.deleteOne();

  clearSession(res);
  res.status(204).end();
}

module.exports = {
  getMyStats,
  getMyActivities,
  logDailySteps,
  parseActivityText,
  updateProfile,
  updatePhoto,
  updatePassword,
  updateGoals,
  updateNotificationPrefs,
  updatePrivacy,
  completeOnboarding,
  deleteAccount,
};
