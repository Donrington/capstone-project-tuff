const express = require("express");
const leaderboard = require("../controllers/leaderboardController");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", requireAuth, asyncHandler(leaderboard.getLeaderboard));
router.get("/teams", requireAuth, asyncHandler(leaderboard.getTeamStandings));
router.get("/challenge/:challengeId", requireAuth, asyncHandler(leaderboard.getChallengeLeaderboard));
router.get("/challenge/:challengeId/teams", requireAuth, asyncHandler(leaderboard.getTeamLeaderboard));
router.get("/challenge/:challengeId/team/:teamId", requireAuth, asyncHandler(leaderboard.getTeamMemberLeaderboard));

module.exports = router;
