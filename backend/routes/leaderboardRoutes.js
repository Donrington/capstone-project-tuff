const express = require("express");
const router = express.Router();

const { getChallengeLeaderboard, getTeamLeaderboard, getTeamMemberLeaderboard } = require("../controllers/leaderboardController");

const {requireAuth} = require("../middleware/authMiddleware");

router.get("/challenge/:challengeId", requireAuth, getChallengeLeaderboard);
router.get("/challenge/:challengeId/teams", requireAuth, getTeamLeaderboard);
router.get("/challenge/:challengeId/team/:teamId", requireAuth, getTeamMemberLeaderboard);

module.exports = router;