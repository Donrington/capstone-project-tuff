const express = require("express");

const router = express.Router();

const challengeParticipant = require("../controllers/challengeParticipantController");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth } = require("../middleware/authMiddleware");


router.post("/:challengeId/join", requireAuth, challengeParticipant.joinChallenge);
router.get("/:challengeId/me", requireAuth, challengeParticipant.getMyParticipation);
router.get("/:challengeId", requireAuth, challengeParticipant.getChallengeParticipants);
router.patch("/:challengeId/progress", requireAuth, challengeParticipant.updateProgress);
router.patch("/:challengeId/complete", requireAuth, challengeParticipant.completeChallenge);
router.delete("/:challengeId/leave", requireAuth, challengeParticipant.leaveChallenge);

module.exports = router;
