const express = require("express");
const notification = require("../controllers/notificationController");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

// Only ever the signed-in user's own notifications.
router.use(requireAuth);

router.get("/", asyncHandler(notification.getNotifications));
router.get("/unread-count", asyncHandler(notification.getUnreadCount));
// Before /:id/read, so "read-all" isn't taken as an :id.
router.patch("/read-all", asyncHandler(notification.markAllRead));
router.patch("/:id/read", asyncHandler(notification.markRead));
router.delete("/:id", asyncHandler(notification.deleteNotification));

module.exports = router;
