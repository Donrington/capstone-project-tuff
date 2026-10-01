const Notification = require("../models/Notification");
const User = require("../models/User");

/** The one shape a notification takes in any API response. */
function toNotificationJson(doc) {
  return {
    id: doc._id.toString(),
    type: doc.type,
    title: doc.title,
    message: doc.message,
    read: doc.read,
    createdAt: doc.createdAt,
  };
}

/** Clamp to the model's maxlengths rather than fail validation over a long
 *  challenge or team name in the copy. */
function clamp(str, max) {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

async function notify(userId, { type, title, message }) {
  return Notification.create({ user: userId, type, title: clamp(title, 100), message: clamp(message, 1000) });
}

/**
 * Notifies several users at once, skipping anyone who's switched off the
 * matching preference (`pref` is a key of User.notificationPrefs, e.g.
 * "teamActivity"). Leave `pref` out for notifications that can't be muted.
 */
async function notifyMany(userIds, { type, title, message, pref }) {
  if (userIds.length === 0) return;
  let recipients = userIds;
  if (pref) {
    const users = await User.find({ _id: { $in: userIds } }).select(`notificationPrefs.${pref}`);
    recipients = users.filter((u) => u.notificationPrefs?.[pref] !== false).map((u) => u._id);
  }
  if (recipients.length === 0) return;
  await Notification.insertMany(
    recipients.map((user) => ({ user, type, title: clamp(title, 100), message: clamp(message, 1000) })),
  );
}

/**
 * Side effects (notifications, achievement checks) must never fail the
 * action that triggered them — a user's activity is logged whether or not
 * the "achievement unlocked" notification could be written.
 */
async function bestEffort(label, fn) {
  try {
    return await fn();
  } catch (err) {
    console.error(`[${label}] failed:`, err);
    return undefined;
  }
}

module.exports = { notify, notifyMany, toNotificationJson, bestEffort };
