const express = require("express");
const challenge = require("../controllers/challengeController");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", requireAuth, asyncHandler(challenge.listMyChallenges));
router.post("/create", requireAuth, asyncHandler(challenge.createChallenge));
router.get("/get/:id", requireAuth, asyncHandler(challenge.getChallenge));
// An invite code still resolves a challenge, but only for someone with a
// session: the public /api/invites/:code route serves the stripped-down preview.
router.get("/getbyCode/:code", requireAuth, asyncHandler(challenge.getChallengeByInviteCode));
router.patch("/update/:id", requireAuth, asyncHandler(challenge.updateChallenge));
router.delete("/delete/:id", requireAuth, asyncHandler(challenge.deleteChallenge));

module.exports = router;
