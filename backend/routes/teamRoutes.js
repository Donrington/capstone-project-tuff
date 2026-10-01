const express = require("express");

const router = express.Router();

const team = require("../controllers/teamController");
const { requireAuth } = require("../middleware/authMiddleware");


router.post("/", requireAuth, team.createTeam);
router.get("/", requireAuth, team.getAllTeams);
router.get("/:id", requireAuth, team.getTeamById);
router.patch("/:id", requireAuth, team.updateTeam);
router.post("/join", requireAuth, team.joinTeam);
router.delete("/leave", requireAuth, team.leaveTeam);
router.get("/:id/members", requireAuth, team.getTeamMembers);


module.exports = router;
