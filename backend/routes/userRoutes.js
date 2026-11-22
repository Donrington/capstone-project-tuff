const express = require("express");
const user = require("../controllers/userController");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth } = require("../middleware/authMiddleware");
const limiters = require("../middleware/limiters");

const router = express.Router();

// Everything here acts on the signed-in user only — there's no :id, so
// there's no way to point one of these at someone else's account.
router.use(requireAuth);

router.get("/me/stats", asyncHandler(user.getMyStats));
router.get("/me/activities", asyncHandler(user.getMyActivities));
router.post("/me/activities", limiters.logActivity, asyncHandler(user.logDailySteps));
router.post("/me/activities/parse", limiters.parseActivity, asyncHandler(user.parseActivityText));
router.patch("/me", asyncHandler(user.updateProfile));
// The photo arrives as a base64 data URL; only this route gets the 3mb parser
// (the global one is 100kb — see server.js).
router.put("/me/photo", express.json({ limit: "3mb" }), asyncHandler(user.updatePhoto));
router.patch("/me/password", limiters.passwordChange, asyncHandler(user.updatePassword));
router.patch("/me/goals", asyncHandler(user.updateGoals));
router.patch("/me/notification-prefs", asyncHandler(user.updateNotificationPrefs));
router.patch("/me/privacy", asyncHandler(user.updatePrivacy));
// Captured once per session by the browser timezone reporter; the controller
// validates the IANA name with Intl and returns 400 for anything invalid.
router.patch("/me/timezone", asyncHandler(user.updateTimezone));
router.post("/me/onboarding", asyncHandler(user.completeOnboarding));
router.delete("/me", limiters.accountDelete, asyncHandler(user.deleteAccount));

module.exports = router;
