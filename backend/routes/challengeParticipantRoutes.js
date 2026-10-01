const express = require("express");
const challengeParticipant = require("../controllers/challengeParticipantController");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/:challengeId/join", requireAuth, asyncHandler(challengeParticipant.joinChallenge));
router.get("/:challengeId/me", requireAuth, asyncHandler(challengeParticipant.getMyParticipation));
router.get("/:challengeId", requireAuth, asyncHandler(challengeParticipant.getChallengeParticipants));
router.post("/:challengeId/activities", requireAuth, asyncHandler(challengeParticipant.logActivity));
router.get("/:challengeId/activities", requireAuth, asyncHandler(challengeParticipant.getChallengeActivities));
router.patch(
  "/:challengeId/progress",
  requireAuth,
  requireRole("admin"),
  asyncHandler(challengeParticipant.updateProgress),
);
router.patch("/:challengeId/complete", requireAuth, asyncHandler(challengeParticipant.completeChallenge));
router.delete("/:challengeId/leave", requireAuth, asyncHandler(challengeParticipant.leaveChallenge));

module.exports = router;
