const express = require("express");
const achievement = require("../controllers/achievementController");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", requireAuth, asyncHandler(achievement.getMyAchievements));

module.exports = router;
