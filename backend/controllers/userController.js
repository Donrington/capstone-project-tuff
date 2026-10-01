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
  updateProfile,
  updatePhoto,
  updatePassword,
  updateGoals,
  updateNotificationPrefs,
  updatePrivacy,
  completeOnboarding,
  deleteAccount,
};
