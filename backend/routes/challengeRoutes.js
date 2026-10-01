const express = require("express");
const challenge = require("../controllers/challengeController");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/create", requireAuth, asyncHandler(challenge.createChallenge));
router.get("/get/:id", requireAuth, asyncHandler(challenge.getChallenge));
router.get("/getbyCode/:code", asyncHandler(challenge.getChallengeByInviteCode));
router.patch("/update/:id", requireAuth, asyncHandler(challenge.updateChallenge));
router.delete("/delete/:id", requireAuth, asyncHandler(challenge.deleteChallenge));
// router.get("/get", asyncHandler(auth.signOut));
// router.post("/refresh", asyncHandler(auth.refresh));
// router.get("/me", requireAuth, asyncHandler(auth.getMe));

module.exports = router;