const express = require("express");
const admin = require("../controllers/adminController");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// Every admin route is signed-in AND checked against the database, not just
// the token (see requireAdmin).
router.use(requireAuth, asyncHandler(requireAdmin));

router.get("/overview", asyncHandler(admin.getOverview));
router.get("/users", asyncHandler(admin.listUsers));
router.patch("/users/:id", asyncHandler(admin.updateUser));
router.get("/challenges", asyncHandler(admin.listChallenges));
router.patch("/challenges/:id", asyncHandler(admin.updateChallenge));
router.get("/teams", asyncHandler(admin.listTeams));

module.exports = router;
