const express = require("express");
const auth = require("../controllers/authController");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/sign-up", asyncHandler(auth.signUp));
router.post("/sign-in", asyncHandler(auth.signIn));
router.post("/google", asyncHandler(auth.googleSignIn));
router.post("/sign-out", asyncHandler(auth.signOut));
router.post("/refresh", asyncHandler(auth.refresh));
router.get("/me", requireAuth, asyncHandler(auth.getMe));

module.exports = router;
