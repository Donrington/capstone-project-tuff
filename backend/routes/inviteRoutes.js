const express = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const createRateLimit = require("../middleware/rateLimit");
const { getInvitePreview } = require("../controllers/inviteController");

const router = express.Router();

// Code lookups are unauthenticated by design, so cap how often one IP can
// probe them. 30/minute is well above a person following a few bad links.
router.get("/:code", createRateLimit({ limit: 30, windowMs: 60 * 1000 }), asyncHandler(getInvitePreview));

module.exports = router;
