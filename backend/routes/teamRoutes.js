const express = require("express");
const team = require("../controllers/teamController");
const matchup = require("../controllers/matchupController");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth } = require("../middleware/authMiddleware");
const createRateLimit = require("../middleware/rateLimit");

const router = express.Router();

// Reaction writes share one per-user budget (30/hour), regardless of which
// team or emoji they're aimed at. requireAuth comes first so key:"user" is set.
const matchupReactionLimit = createRateLimit({
  limit: 30,
  windowMs: 60 * 60 * 1000,
  key: "user",
});

router.post("/", requireAuth, asyncHandler(team.createTeam));
router.get("/", requireAuth, asyncHandler(team.getAllTeams));
router.get("/code/:code", requireAuth, asyncHandler(team.getTeamByCode));
router.get("/:id", requireAuth, asyncHandler(team.getTeamById));
router.get("/:id/activity", requireAuth, asyncHandler(team.getTeamActivity));
router.get("/:id/matchup", requireAuth, asyncHandler(matchup.getMatchup));
router.get("/:id/results", requireAuth, asyncHandler(matchup.getResults));
router.put("/:id/matchup/reaction", requireAuth, matchupReactionLimit, asyncHandler(matchup.setReaction));
router.delete("/:id/matchup/reaction", requireAuth, matchupReactionLimit, asyncHandler(matchup.clearReaction));
router.patch("/:id", requireAuth, asyncHandler(team.updateTeam));
router.post("/join", requireAuth, asyncHandler(team.joinTeam));
router.delete("/leave", requireAuth, asyncHandler(team.leaveTeam));
router.get("/:id/members", requireAuth, asyncHandler(team.getTeamMembers));

module.exports = router;
