const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const ApiError = require("../utils/ApiError");
const { toNotificationJson } = require("../services/notificationService");

/** Looks up one of the signed-in user's own notifications. Someone else's
 *  ID answers 404, same as a missing one — no hint that it exists. */
async function findMine(req) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw ApiError.notFound("Notification not found.");
  const notification = await Notification.findOne({ _id: id, user: req.user.id });
  if (!notification) throw ApiError.notFound("Notification not found.");
  return notification;
}

// GET /api/notifications?limit=30&before=<ISO>&unread=true
// Newest first. Page back with `before` = the last item's createdAt.
async function getNotifications(req, res) {
  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
  const filter = { user: req.user.id };
  if (req.query.unread === "true") filter.read = false;
  if (req.query.before) {
    const before = new Date(req.query.before);
    if (Number.isNaN(before.getTime())) throw ApiError.badRequest("before must be an ISO date.");
    filter.createdAt = { $lt: before };
  }

  const items = await Notification.find(filter).sort({ createdAt: -1 }).limit(limit);
  res.json(items.map(toNotificationJson));
}

// GET /api/notifications/unread-count — for the bell's dot, without
// fetching the list.
async function getUnreadCount(req, res) {
  const count = await Notification.countDocuments({ user: req.user.id, read: false });
  res.json({ count });
}

// PATCH /api/notifications/:id/read
async function markRead(req, res) {
  const notification = await findMine(req);
  if (!notification.read) {
    notification.read = true;
    await notification.save();
  }
  res.json(toNotificationJson(notification));
}

// PATCH /api/notifications/read-all
async function markAllRead(req, res) {
  await Notification.updateMany({ user: req.user.id, read: false }, { read: true });
  res.status(204).end();
}

// DELETE /api/notifications/:id
async function deleteNotification(req, res) {
  const notification = await findMine(req);
  await notification.deleteOne();
  res.status(204).end();
}

module.exports = { getNotifications, getUnreadCount, markRead, markAllRead, deleteNotification };
