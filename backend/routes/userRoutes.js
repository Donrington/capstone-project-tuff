const express = require("express");
const user = require("../controllers/userController");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

// Everything here acts on the signed-in user only — there's no :id, so
// there's no way to point one of these at someone else's account.
router.use(requireAuth);

router.patch("/me", asyncHandler(user.updateProfile));
router.put("/me/photo", asyncHandler(user.updatePhoto));
router.patch("/me/password", asyncHandler(user.updatePassword));
router.patch("/me/goals", asyncHandler(user.updateGoals));
router.patch("/me/notification-prefs", asyncHandler(user.updateNotificationPrefs));
router.patch("/me/privacy", asyncHandler(user.updatePrivacy));
router.post("/me/onboarding", asyncHandler(user.completeOnboarding));
router.delete("/me", asyncHandler(user.deleteAccount));

module.exports = router;
