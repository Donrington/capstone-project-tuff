const express = require("express");
const auth = require("../controllers/authController");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth } = require("../middleware/authMiddleware");
const limiters = require("../middleware/limiters");

const router = express.Router();

router.post("/sign-up", limiters.signUp, asyncHandler(auth.signUp));
router.post("/sign-in", limiters.signIn, asyncHandler(auth.signIn));
router.post("/google", limiters.google, asyncHandler(auth.googleSignIn));
router.post("/sign-out", asyncHandler(auth.signOut));
router.post("/refresh", limiters.refresh, asyncHandler(auth.refresh));
router.get("/me", requireAuth, asyncHandler(auth.getMe));

module.exports = router;
