const express = require("express");
const team = require("../controllers/teamController");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", requireAuth, asyncHandler(team.createTeam));
router.get("/", requireAuth, asyncHandler(team.getAllTeams));
router.get("/code/:code", requireAuth, asyncHandler(team.getTeamByCode));
router.get("/:id", requireAuth, asyncHandler(team.getTeamById));
router.get("/:id/activity", requireAuth, asyncHandler(team.getTeamActivity));
router.patch("/:id", requireAuth, asyncHandler(team.updateTeam));
router.post("/join", requireAuth, asyncHandler(team.joinTeam));
router.delete("/leave", requireAuth, asyncHandler(team.leaveTeam));
router.get("/:id/members", requireAuth, asyncHandler(team.getTeamMembers));

module.exports = router;
